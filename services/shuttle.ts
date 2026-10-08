import { openDatabaseSync } from "expo-sqlite"
import { Float } from "react-native/Libraries/Types/CodegenTypes"
import { roundToCents } from "./session"

const db = openDatabaseSync('db.db')

export type Shuttle = {
    shuttle_id: number,
    name: string,
    total_price: Float,
    num_of_shuttles: number
}

export type WarnUnit = 'shuttles' | 'sessions'
export type StockStatus = 'out' | 'low' | 'ok'

export async function isShuttleNameTaken(name: string, excludeId?: number): Promise<boolean> {
    const row = await db.getFirstAsync(
        `SELECT 1 FROM shuttles WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND shuttle_id IS NOT ?`,
        [name, excludeId ?? null]
    )

    return row !== null
}

async function validateShuttleName(name: string, excludeId?: number) {
    if (name.length === 0) throw new Error('Name is required')
    if (await isShuttleNameTaken(name, excludeId)) throw new Error('A shuttle with this name already exists')
}

export async function createShuttle({
    name,
    tube_price,
    per_tube,
    tubes,
    date
}: {
    name: string,
    tube_price: number,
    per_tube: number,
    tubes: number,
    date?: string
}): Promise<number> {
    const trimmed = name.trim()
    await validateShuttleName(trimmed)
    if (!Number.isInteger(per_tube) || per_tube < 1 || !Number.isInteger(tubes) || tubes < 1) {
        throw new Error('Shuttles per tube and tubes must be at least 1')
    }
    if (!(tube_price > 0)) throw new Error('Tube price must be more than 0')

    const num_of_shuttles = per_tube * tubes
    const total_price = roundToCents(roundToCents(tube_price / per_tube) * num_of_shuttles)

    let shuttleId = 0
    await db.withTransactionAsync(async () => {
        const res = await db.runAsync(
            `INSERT into shuttles (name, total_price, num_of_shuttles) VALUES (?, ?, ?)`,
            [trimmed, total_price, num_of_shuttles]
        )
        shuttleId = res.lastInsertRowId

        await addShuttlePurchase({ shuttle_id: shuttleId, num_of_shuttles, date })
    })

    return shuttleId
}

export async function addShuttlePurchase({
    shuttle_id,
    num_of_shuttles,
    date
}: {
    shuttle_id: number,
    num_of_shuttles: number,
    date?: string
}) {
    const res = await db.runAsync(
        `INSERT INTO shuttle_purchases (shuttle_id, num_of_shuttles, date) VALUES (?, ?, COALESCE(?, datetime('now')))`,
        [shuttle_id, num_of_shuttles, date ?? null]
    )

    return res.lastInsertRowId
}

export async function updateShuttle({
    shuttle_id,
    name,
    price_per_shuttle,
    warn_at,
    warn_unit
}: {
    shuttle_id: number,
    name: string,
    price_per_shuttle: number,
    warn_at: number | null,
    warn_unit: WarnUnit | null
}): Promise<void> {
    const trimmed = name.trim()
    await validateShuttleName(trimmed, shuttle_id)
    if (!(price_per_shuttle > 0)) throw new Error('Price must be more than 0')
    if (warn_at !== null && (!Number.isInteger(warn_at) || warn_at < 1 || warn_unit === null)) {
        throw new Error('Warn at must be a whole number of at least 1')
    }

    await db.runAsync(
        `UPDATE shuttles SET name = ?, total_price = ROUND(? * num_of_shuttles, 2), warn_at = ?, warn_unit = ? WHERE shuttle_id = ?`,
        [trimmed, roundToCents(price_per_shuttle), warn_at, warn_at === null ? null : warn_unit, shuttle_id]
    )
}

export type ShuttlePurchase = {
    shuttle_purchase_id: number,
    shuttle_id: number,
    num_of_shuttles: number,
    date: string
}

export async function fetchShuttlePurchaseHistory(shuttle_id: number): Promise<ShuttlePurchase[]> {
    const res: ShuttlePurchase[] = await db.getAllAsync(
        `SELECT * FROM shuttle_purchases WHERE shuttle_id = ? ORDER BY date DESC`,
        [shuttle_id]
    )

    return res
}

export type ShuttleWithInventory = {
    shuttle_id: number,
    name: string,
    total_price: number,
    num_of_shuttles: number,
    remaining: number,
    times_purchased: number
}

export async function fetchAllShuttlesWithInventory(): Promise<ShuttleWithInventory[]> {
    const res: ShuttleWithInventory[] = await db.getAllAsync(`
        SELECT
        s.shuttle_id,
        s.name,
        s.total_price,
        s.num_of_shuttles,
        COALESCE(purchased.total_purchased, 0) - COALESCE(used.total_used, 0) AS remaining,
        COALESCE(purchased.times_purchased, 0) AS times_purchased
        FROM shuttles s
        LEFT JOIN (
            SELECT shuttle_id, SUM(num_of_shuttles) AS total_purchased, COUNT(*) AS times_purchased
            FROM shuttle_purchases
            GROUP BY shuttle_id
        ) purchased ON purchased.shuttle_id = s.shuttle_id
        LEFT JOIN (
            SELECT shuttle_id, COUNT(*) AS total_used
            FROM shuttle_instances
            WHERE shuttle_id IS NOT NULL
            GROUP BY shuttle_id
        ) used ON used.shuttle_id = s.shuttle_id
        ORDER BY s.shuttle_id ASC
        `)

    return res
}

export type ShuttleStockType = {
    shuttle_id: number,
    name: string,
    price_per_shuttle: number,
    remaining: number,
    used_since_last_purchase: number,
    avg_per_session: number | null,
    runway_sessions: number | null,
    warn_at: number | null,
    warn_unit: WarnUnit | null,
    status: StockStatus,
    alert: boolean
}

export type ShuttleStock = {
    types: ShuttleStockType[],
    totals: {
        total_remaining: number,
        type_count: number,
        out_count: number,
        low_count: number,
        alert_count: number,
        club_avg_per_session: number | null,
        window_sessions: number
    }
}

const STOCK_WINDOW_SELECT = `
        SELECT se.session_id, se.date, COUNT(*) AS count
        FROM sessions se
        JOIN shuttle_instances si ON si.session_id = se.session_id AND si.shuttle_id IS NOT NULL
        WHERE se.status = 'closed'
        GROUP BY se.session_id
        ORDER BY se.date DESC, se.session_id DESC
        LIMIT ?
`

export async function fetchShuttlesPerSession(limit: number = 8): Promise<{ session_id: number, date: string, count: number }[]> {
    const res: { session_id: number, date: string, count: number }[] = await db.getAllAsync(STOCK_WINDOW_SELECT, [limit])

    return res.reverse()
}

const STATUS_RANK: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 }

export async function fetchShuttleStock(): Promise<ShuttleStock> {
    const windowRows = await fetchShuttlesPerSession(8)
    const windowSessions = windowRows.length
    const clubUsed = windowRows.reduce((acc, row) => acc + row.count, 0)

    const rows: any[] = await db.getAllAsync(`
        SELECT
        s.shuttle_id,
        s.name,
        s.total_price,
        s.num_of_shuttles,
        s.warn_at,
        s.warn_unit,
        COALESCE(purchased.total_purchased, 0) - COALESCE(used.total_used, 0) AS remaining,
        (
            SELECT COUNT(*) FROM shuttle_instances si
            JOIN sessions se ON se.session_id = si.session_id
            WHERE si.shuttle_id = s.shuttle_id AND datetime(se.date) > purchased.last_purchase
        ) AS used_since_last_purchase,
        (
            SELECT COUNT(*) FROM shuttle_instances si
            WHERE si.shuttle_id = s.shuttle_id
            AND si.session_id IN (SELECT session_id FROM (${STOCK_WINDOW_SELECT}))
        ) AS window_used
        FROM shuttles s
        LEFT JOIN (
            SELECT shuttle_id, SUM(num_of_shuttles) AS total_purchased, MAX(datetime(date)) AS last_purchase
            FROM shuttle_purchases
            GROUP BY shuttle_id
        ) purchased ON purchased.shuttle_id = s.shuttle_id
        LEFT JOIN (
            SELECT shuttle_id, COUNT(*) AS total_used
            FROM shuttle_instances
            WHERE shuttle_id IS NOT NULL
            GROUP BY shuttle_id
        ) used ON used.shuttle_id = s.shuttle_id
        `, [8])

    const runwayFor = (remaining: number, used: number) =>
        windowSessions > 0 && used > 0 ? (remaining > 0 ? Math.floor(remaining * windowSessions / used) : 0) : null

    const types: ShuttleStockType[] = rows.map((row) => {
        const remaining: number = row.remaining
        const runway = runwayFor(remaining, row.window_used)
        const warnRunway = runway ?? runwayFor(remaining, clubUsed)
        const status: StockStatus =
            remaining <= 0 ? 'out'
                : row.warn_unit === 'shuttles' ? (remaining <= row.warn_at ? 'low' : 'ok')
                    : row.warn_unit === 'sessions' ? (warnRunway !== null && warnRunway <= row.warn_at ? 'low' : 'ok')
                        : remaining < 2 ? 'low' : 'ok'

        return {
            shuttle_id: row.shuttle_id,
            name: row.name,
            price_per_shuttle: row.total_price / row.num_of_shuttles,
            remaining,
            used_since_last_purchase: row.used_since_last_purchase,
            avg_per_session: windowSessions > 0 && row.window_used > 0 ? row.window_used / windowSessions : null,
            runway_sessions: runway,
            warn_at: row.warn_at,
            warn_unit: row.warn_unit,
            status,
            alert: row.warn_at !== null && status !== 'ok'
        }
    })

    types.sort((a, b) =>
        STATUS_RANK[a.status] - STATUS_RANK[b.status]
        || (a.runway_sessions ?? Infinity) - (b.runway_sessions ?? Infinity)
        || a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    )

    return {
        types,
        totals: {
            total_remaining: types.reduce((acc, t) => acc + Math.max(t.remaining, 0), 0),
            type_count: types.length,
            out_count: types.filter((t) => t.status === 'out').length,
            low_count: types.filter((t) => t.status === 'low').length,
            alert_count: types.filter((t) => t.alert).length,
            club_avg_per_session: windowSessions > 0 ? clubUsed / windowSessions : null,
            window_sessions: windowSessions
        }
    }
}

export async function fetchAllShuttles(): Promise<Shuttle[]> {
    const res: Shuttle[] = await db.getAllAsync(`SELECT * FROM shuttles`)

    return res
}

export async function fetchShuttleById(id: number): Promise<Shuttle[]> {
    const res: Shuttle[] = await db.getAllAsync(`SELECT * FROM shuttles WHERE shuttle_id = (?)`, [id])
    return res
}


export type ShuttlesBySession = {
    session_id: number,
    shuttles: {
        shuttle_id: number | null,
        name: string,
        total_price: number,
        num_of_shuttles: number | null,
        total_quantity_used: number,
        matches_used_in: {
            match_id: number,
            quantity_used: number
        }[]
    }[]
}

export type ShuttlesBySessionMatches = {
    session_id: number,
    matches: {
        match_id: number,
        total_quantity_used: number,
        shuttles: {
            shuttle_id: number | null,
            name: string,
            total_price: number,
            num_of_shuttles: number | null,
            quantity_used: number
        }[]
    }[]
}

type ShuttlesBySessionResult<Invert extends boolean> = Invert extends true ? ShuttlesBySessionMatches : ShuttlesBySession



export async function fetchAllShuttlesBySessionId<Invert extends boolean>(id: string, invert: Invert): Promise<ShuttlesBySessionResult<Invert>> {
    const shuttlesMatchRows: any = await db.getAllAsync(`
        SELECT
        s.name AS shuttle_name,
        s.total_price,
        s.num_of_shuttles,
        si.shuttle_id,
        si.shuttle_instance_id,
        m.match_id
        FROM matches m
        LEFT JOIN match_shuttle_instances msi ON msi.match_id = m.match_id
        LEFT JOIN shuttle_instances si ON si.shuttle_instance_id = msi.shuttle_instance_id
        LEFT JOIN shuttles s ON s.shuttle_id = si.shuttle_id
        WHERE m.session_id = ?
        `, [id])

    // Each row is one shuttle instance used in one match -- bucket by shuttle_id (or
    // 'free' for shuttle_id IS NULL) and count instances per match to reconstruct the
    // old "quantity_used" the aggregate match_shuttles table used to store directly.
    const buckets: Record<string, {
        shuttle_id: number | null,
        name: string,
        total_price: number,
        num_of_shuttles: number | null,
        matchCounts: Record<number, number>
    }> = {}

    for (const row of shuttlesMatchRows) {
        if (row.shuttle_instance_id === null) continue

        const key = row.shuttle_id === null ? 'free' : String(row.shuttle_id)
        if (!buckets[key]) {
            buckets[key] = {
                shuttle_id: row.shuttle_id,
                name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
                total_price: row.shuttle_id === null ? 0 : row.total_price,
                num_of_shuttles: row.shuttle_id === null ? null : row.num_of_shuttles,
                matchCounts: {}
            }
        }
        buckets[key].matchCounts[row.match_id] = (buckets[key].matchCounts[row.match_id] ?? 0) + 1
    }

    if (invert) {
        const matchesMap: Record<number, any> = {}
        for (const bucket of Object.values(buckets)) {
            for (const [matchIdStr, quantity_used] of Object.entries(bucket.matchCounts)) {
                const matchId = Number(matchIdStr)
                if (!matchesMap[matchId]) {
                    matchesMap[matchId] = {
                        match_id: matchId,
                        total_quantity_used: 0,
                        shuttles_used: [] as Array<{ shuttle_id: number | null, name: string, total_price: number, num_of_shuttles: number | null, quantity_used: number }>
                    }
                }

                matchesMap[matchId].total_quantity_used += quantity_used
                matchesMap[matchId].shuttles_used.push({
                    shuttle_id: bucket.shuttle_id,
                    name: bucket.name,
                    total_price: bucket.total_price,
                    num_of_shuttles: bucket.num_of_shuttles,
                    quantity_used
                })
            }
        }

        return {
            session_id: parseInt(id),
            matches: Object.values(matchesMap)
        } as ShuttlesBySessionResult<Invert>
    }

    const shuttles = Object.values(buckets).map((bucket) => {
        const matches_used_in = Object.entries(bucket.matchCounts).map(([matchIdStr, quantity_used]) => ({
            match_id: Number(matchIdStr),
            quantity_used
        }))
        const total_quantity_used = matches_used_in.reduce((acc, m) => acc + m.quantity_used, 0)

        return {
            shuttle_id: bucket.shuttle_id,
            name: bucket.name,
            total_price: bucket.total_price,
            num_of_shuttles: bucket.num_of_shuttles,
            total_quantity_used,
            matches_used_in
        }
    })

    return {
        session_id: parseInt(id),
        shuttles
    } as ShuttlesBySessionResult<Invert>
}



export type ShuttleTypeOption = {
    shuttle_id: number,
    name: string,
    remaining: number
}

const SHUTTLE_TYPE_OPTION_SELECT = `
        SELECT
        s.shuttle_id,
        s.name,
        COALESCE(purchased.total_purchased, 0) - COALESCE(used.total_used, 0) AS remaining,
        COALESCE(used.total_used, 0) AS total_used
        FROM shuttles s
        LEFT JOIN (
            SELECT shuttle_id, SUM(num_of_shuttles) AS total_purchased
            FROM shuttle_purchases
            GROUP BY shuttle_id
        ) purchased ON purchased.shuttle_id = s.shuttle_id
        LEFT JOIN (
            SELECT shuttle_id, COUNT(*) AS total_used
            FROM shuttle_instances
            WHERE shuttle_id IS NOT NULL
            GROUP BY shuttle_id
        ) used ON used.shuttle_id = s.shuttle_id
`

export async function fetchTopShuttleTypes(limit: number = 3): Promise<ShuttleTypeOption[]> {
    const res: ShuttleTypeOption[] = await db.getAllAsync(`
        SELECT shuttle_id, name, remaining FROM (${SHUTTLE_TYPE_OPTION_SELECT})
        WHERE remaining > 0
        ORDER BY total_used DESC, shuttle_id DESC
        LIMIT ?
        `, [limit])

    return res
}

export async function fetchSessionShuttleTypes(sessionId: number): Promise<ShuttleTypeOption[]> {
    const res: ShuttleTypeOption[] = await db.getAllAsync(`
        SELECT shuttle_id, name, remaining FROM (${SHUTTLE_TYPE_OPTION_SELECT})
        WHERE shuttle_id IN (
            SELECT DISTINCT shuttle_id
            FROM shuttle_instances
            WHERE session_id = ? AND shuttle_id IS NOT NULL
        )
        ORDER BY shuttle_id ASC
        `, [sessionId])

    return res
}
