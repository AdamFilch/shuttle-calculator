import { openDatabaseSync } from "expo-sqlite"
import { Float } from "react-native/Libraries/Types/CodegenTypes"
import {
    eachDayOfInterval,
    endOfMonth,
    format,
    startOfMonth,
    subDays,
    subMonths,
} from "date-fns"

const db = openDatabaseSync('db.db')

export type Shuttle = {
    shuttle_id: number,
    name: string,
    total_price: Float,
    num_of_shuttles: number
}

export async function createShuttle({
    name,
    total_price,
    num_of_shuttles
}: {
    name: string,
    total_price: number,
    num_of_shuttles: number
}) {
    await db.execAsync("BEGIN TRANSACTION")

    const res = await db.runAsync(
        `INSERT into shuttles (name, total_price, num_of_shuttles) VALUES (?, ?, ?)`,
        [name, total_price, num_of_shuttles]
    )
    const shuttleId = res.lastInsertRowId

    await db.runAsync(
        `INSERT INTO shuttle_purchases (shuttle_id, num_of_shuttles) VALUES (?, ?)`,
        [shuttleId, num_of_shuttles]
    )

    await db.execAsync("COMMIT")

    return shuttleId
}

export async function addShuttlePurchase({
    shuttle_id,
    num_of_shuttles
}: {
    shuttle_id: number,
    num_of_shuttles: number
}) {
    const res = await db.runAsync(
        `INSERT INTO shuttle_purchases (shuttle_id, num_of_shuttles) VALUES (?, ?)`,
        [shuttle_id, num_of_shuttles]
    )

    return res.lastInsertRowId
}

export async function updateShuttle({
    shuttle_id,
    name,
    price_per_shuttle
}: {
    shuttle_id: number,
    name: string,
    price_per_shuttle: number
}) {
    await db.runAsync(
        `UPDATE shuttles SET name = ?, total_price = ? * num_of_shuttles WHERE shuttle_id = ?`,
        [name, price_per_shuttle, shuttle_id]
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

export type ShuttleUsageSummary = {
    totalUsed: number,
    totalRemaining: number
}

export async function fetchShuttleUsageSummary(): Promise<ShuttleUsageSummary> {
    const res: ShuttleUsageSummary[] = await db.getAllAsync(`
        SELECT
        COALESCE(SUM(used.total_used), 0) AS totalUsed,
        COALESCE(SUM(purchased.total_purchased), 0) - COALESCE(SUM(used.total_used), 0) AS totalRemaining
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
        `)

    return res[0] ?? { totalUsed: 0, totalRemaining: 0 }
}

export async function fetchEarliestShuttleUsageDate(): Promise<string | null> {
    const res: any = await db.getFirstAsync(`
        SELECT MIN(date) as earliest FROM shuttle_instances WHERE shuttle_id IS NOT NULL
        `)

    return res?.earliest ?? null
}

export type ShuttleUsageRange = '1w' | '1m' | '6m' | '12m'

export type ShuttleUsagePoint = {
    label: string,
    value: number
}

function shuttleUsageRangeStart(range: ShuttleUsageRange, now: Date): Date {
    switch (range) {
        case '1w': return subDays(now, 6)
        case '1m': return subDays(now, 29)
        case '6m': return subDays(now, 181)
        case '12m': return startOfMonth(subMonths(now, 11))
    }
}

// Buckets are built in JS (not via SQLite's strftime) so week/month grouping
// stays consistent with date-fns' own interval math rather than needing to
// reconcile two different week/month numbering schemes.
export async function fetchShuttleUsageTimeSeries(range: ShuttleUsageRange): Promise<ShuttleUsagePoint[]> {
    const now = new Date()
    const start = shuttleUsageRangeStart(range, now)

    const rows: any = await db.getAllAsync(`
        SELECT date(date) as day, COUNT(*) as count
        FROM shuttle_instances
        WHERE shuttle_id IS NOT NULL AND date(date) >= date(?)
        GROUP BY day
        `, [format(start, 'yyyy-MM-dd')])

    const countsByDay: Record<string, number> = {}
    for (const row of rows) countsByDay[row.day] = row.count

    const countForDay = (day: Date) => countsByDay[format(day, 'yyyy-MM-dd')] ?? 0

    if (range === '1w' || range === '1m') {
        return eachDayOfInterval({ start, end: now }).map((day) => ({
            label: format(day, range === '1w' ? 'EEE' : 'd MMM'),
            value: countForDay(day)
        }))
    }

    if (range === '6m') {
        const weeks: { start: Date, end: Date }[] = []
        let weekStart = start
        while (weekStart <= now) {
            const weekEnd = subDays(weekStart, -6) < now ? subDays(weekStart, -6) : now
            weeks.push({ start: weekStart, end: weekEnd })
            weekStart = subDays(weekStart, -7)
        }

        return weeks.map(({ start: weekStart, end: weekEnd }) => ({
            label: format(weekStart, 'd MMM'),
            value: eachDayOfInterval({ start: weekStart, end: weekEnd }).reduce(
                (sum, day) => sum + countForDay(day), 0
            )
        }))
    }

    // 12m
    const months = []
    let monthStart = start
    while (monthStart <= now) {
        months.push(monthStart)
        monthStart = startOfMonth(subMonths(monthStart, -1))
    }

    return months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart) < now ? endOfMonth(monthStart) : now
        return {
            label: format(monthStart, 'MMM yyyy'),
            value: eachDayOfInterval({ start: monthStart, end: monthEnd }).reduce(
                (sum, day) => sum + countForDay(day), 0
            )
        }
    })
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


