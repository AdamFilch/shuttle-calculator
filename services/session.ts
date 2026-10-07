import { openDatabaseSync } from "expo-sqlite";
import { CourtBooking, fetchCourtBookingsBySessionId } from "./court";
import type { AvatarColour } from "./player";
import { Shuttle } from "./shuttle";
import { DisplayTimeDDDASHMMDASHYYYY } from "./time-display";

export type Session = {
    session_id: number,
    name: string,
    date: string,
    start_time: string | null,
    location: string | null,
    status: 'open' | 'closed',
    closed_date: string | null,
    amount_due: number | null,
    player_count: number,
    match_count: number
}

const db = openDatabaseSync('db.db')

export async function createNewSession({
    name,
    date,
    startTime,
    location
}: {
    name?: string,
    date: string,
    startTime?: string,
    location?: string
}) {
    const finalName = name?.trim() ?? ''
    const finalLocation = location?.trim() || null

    const res = await db.runAsync(
        `INSERT into sessions (name, date, start_time, location) VALUES (?, ?, ?, ?)`,
        [finalName, date, startTime ?? null, finalLocation]
    );

    return res.lastInsertRowId
}

export function formatSessionTitle(session: { name: string | null | undefined, date: string }): string {
    const dateLabel = DisplayTimeDDDASHMMDASHYYYY(session.date) ?? ''
    return session.name ? `${session.name} - ${dateLabel}` : dateLabel
}


export type SessionSummary = Session & {
    shuttle_count: number,
    outstanding_amount: number
}

export async function fetchAllSessions(): Promise<SessionSummary[]> {
    const res: SessionSummary[] = await db.getAllAsync(`
        SELECT s.*, COUNT(DISTINCT mp.player_id) as player_count, COUNT(DISTINCT m.match_id) as match_count,
        (SELECT COUNT(*) FROM shuttle_instances si WHERE si.session_id = s.session_id) AS shuttle_count,
        COALESCE((
            SELECT SUM(sp.amount_paid) FROM shuttle_payments sp
            JOIN shuttle_instances si ON si.shuttle_instance_id = sp.shuttle_instance_id
            WHERE si.session_id = s.session_id
        ), 0) + COALESCE((
            SELECT SUM(cp.amount_paid) FROM court_payments cp
            JOIN court_bookings cb ON cb.court_booking_id = cp.court_booking_id
            WHERE cb.session_id = s.session_id
        ), 0) AS outstanding_amount
        FROM sessions s
        LEFT JOIN matches m ON m.session_id = s.session_id
        LEFT JOIN match_players mp ON mp.match_id = m.match_id AND mp.player_id IS NOT NULL
        GROUP BY s.session_id
    `)

    return res
}

export type SessionMatches = Session & {
    matches: {
        match_id: string,
        match_number: number,
        match_date: string,
        shuttles: Shuttle[],
        shuttle_count: number,
        free_count: number,
        all_free: boolean,
        reused_from: { match_number: number, count: number }[],
        players: {
            name: string,
            player_id: number,
            position: number,
            avatar_colour: AvatarColour | null,
        }[]
    }[],
    courts: CourtBooking[]
}

export async function fetchSessionById(id: string): Promise<SessionMatches> {
    // Step 1: Fetch session info
    const session: any = await db.getFirstAsync(
        `SELECT * FROM sessions WHERE session_id = ?`,
        [id]
    );
    if (!session) return null;
    const matchRows: any = await db.getAllAsync(`
        SELECT
        m.match_id,
        m.match_number,
        m.date as match_date,
        si.shuttle_instance_id,
        si.shuttle_id,
        s.name as shuttle_name,
        s.total_price,
        s.num_of_shuttles,
        mp.player_id,
        mp.position,
        p.name as player_name,
        p.avatar_colour
        FROM matches m
        LEFT JOIN match_shuttle_instances msi ON m.match_id = msi.match_id
        LEFT JOIN shuttle_instances si ON si.shuttle_instance_id = msi.shuttle_instance_id
        LEFT JOIN shuttles s ON s.shuttle_id = si.shuttle_id
        LEFT JOIN match_players mp ON m.match_id = mp.match_id
        LEFT JOIN players p ON p.player_id = mp.player_id
        WHERE m.session_id = ?
        `, [id])

    const matchesMap: Record<number, any> = {}
    for (const row of matchRows) {
        let match = matchesMap[row.match_id]
        if (!match) {
            match = {
                match_id: row.match_id,
                match_number: row.match_number,
                match_date: row.match_date,
                shuttlesMap: {},
                seenInstances: new Set<number>(),
                freeInstances: new Set<number>(),
                playersMap: {},
            }
            matchesMap[row.match_id] = match
        }

        // match_shuttle_instances rows are cross-joined against match_players rows
        // above, so the same shuttle_instance_id appears once per player -- dedupe
        // before counting.
        if (row.shuttle_instance_id !== null && !match.seenInstances.has(row.shuttle_instance_id)) {
            match.seenInstances.add(row.shuttle_instance_id)
            if (row.shuttle_id === null) match.freeInstances.add(row.shuttle_instance_id)
            const key = row.shuttle_id === null ? 'free' : String(row.shuttle_id)
            if (!match.shuttlesMap[key]) {
                match.shuttlesMap[key] = {
                    shuttle_id: row.shuttle_id,
                    name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
                    quantity_used: 0,
                    total_price: row.shuttle_id === null ? 0 : row.total_price,
                    num_of_shuttles: row.shuttle_id === null ? null : row.num_of_shuttles
                }
            }
            match.shuttlesMap[key].quantity_used += 1
        }

        if (row.player_id && !match.playersMap[row.player_id]) {
            match.playersMap[row.player_id] = {
                player_id: row.player_id,
                name: row.player_name,
                position: row.position,
                avatar_colour: row.avatar_colour
            }
        }
    }

    const firstMatchNumberByInstance: Record<number, number> = {}
    for (const m of Object.values(matchesMap)) {
        for (const instanceId of m.seenInstances) {
            const first = firstMatchNumberByInstance[instanceId]
            if (first === undefined || m.match_number < first) firstMatchNumberByInstance[instanceId] = m.match_number
        }
    }

    const matches = Object.values(matchesMap).map(m => {
        const reusedByMatch: Record<number, number> = {}
        let freeCount = 0
        for (const instanceId of m.seenInstances) {
            const first = firstMatchNumberByInstance[instanceId]
            if (first < m.match_number) {
                reusedByMatch[first] = (reusedByMatch[first] ?? 0) + 1
            } else if (m.freeInstances.has(instanceId)) {
                freeCount += 1
            }
        }
        return {
            match_id: m.match_id,
            match_number: m.match_number,
            match_date: m.match_date,
            shuttles: Object.values(m.shuttlesMap),
            shuttle_count: m.seenInstances.size,
            free_count: freeCount,
            all_free: m.seenInstances.size > 0 && m.freeInstances.size === m.seenInstances.size,
            reused_from: Object.entries(reusedByMatch)
                .map(([matchNumber, count]) => ({ match_number: Number(matchNumber), count }))
                .sort((a, b) => a.match_number - b.match_number),
            players: Object.values(m.playersMap).sort((player1: { position }, player2: { position }) => player1.position - player2.position)
        }
    })

    const courts = await fetchCourtBookingsBySessionId(id)

    return {
        ...session,
        matches,
        courts
    }
}

export type PlayerChargePreview = {
    player_id: number,
    name: string,
    avatar_colour: AvatarColour | null,
    matches: number,
    court_share: number,
    shuttle_share: number,
    total: number
}

export type SessionChargesPreview = {
    courtTotal: number,
    shuttleTotal: number,
    shareTotal: number,
    players: PlayerChargePreview[],
    courtCharges: { court_booking_id: number, player_id: number, amount: string }[],
    shuttleCharges: { shuttle_instance_id: number, player_id: number, amount: string }[]
}

function roundToCents(amount: number): number {
    return Math.round(amount * 100) / 100
}

export async function previewSessionCharges(sessionId: string): Promise<SessionChargesPreview> {
    const participantRows: any = await db.getAllAsync(`
        SELECT mp.player_id, p.name, p.avatar_colour, COUNT(DISTINCT m.match_id) AS matches
        FROM match_players mp
        JOIN matches m ON m.match_id = mp.match_id
        JOIN players p ON p.player_id = mp.player_id
        WHERE m.session_id = ?
        GROUP BY mp.player_id
        `, [sessionId])
    const participantIds: number[] = participantRows.map((r: any) => r.player_id)

    const courtBookings = await fetchCourtBookingsBySessionId(sessionId)

    const shuttleInstanceRows: any = await db.getAllAsync(`
        SELECT DISTINCT si.shuttle_instance_id, si.shuttle_id
        FROM match_shuttle_instances msi
        JOIN matches m ON m.match_id = msi.match_id
        JOIN shuttle_instances si ON si.shuttle_instance_id = msi.shuttle_instance_id
        WHERE m.session_id = ?
        `, [sessionId])

    const payableInstances = shuttleInstanceRows.filter((r: any) => r.shuttle_id !== null)

    const shuttleIds: number[] = [...new Set(payableInstances.map((r: any) => r.shuttle_id))] as number[]
    const priceByShuttleId: Record<number, { total_price: number, num_of_shuttles: number }> = {}
    if (shuttleIds.length > 0) {
        const shuttlePlaceholders = shuttleIds.map(() => '?').join(',')
        const shuttleRows: any = await db.getAllAsync(`
            SELECT shuttle_id, total_price, num_of_shuttles FROM shuttles WHERE shuttle_id IN (${shuttlePlaceholders})
            `, shuttleIds)
        for (const row of shuttleRows) {
            priceByShuttleId[row.shuttle_id] = { total_price: row.total_price, num_of_shuttles: row.num_of_shuttles }
        }
    }

    const instanceIds: number[] = payableInstances.map((r: any) => r.shuttle_instance_id)
    const playersByInstance: Record<number, number[]> = {}
    if (instanceIds.length > 0) {
        const instancePlaceholders = instanceIds.map(() => '?').join(',')
        const instancePlayerRows: any = await db.getAllAsync(`
            SELECT DISTINCT msi.shuttle_instance_id, mp.player_id
            FROM match_shuttle_instances msi
            JOIN match_players mp ON mp.match_id = msi.match_id
            WHERE msi.shuttle_instance_id IN (${instancePlaceholders})
            `, instanceIds)
        for (const row of instancePlayerRows) {
            if (!playersByInstance[row.shuttle_instance_id]) playersByInstance[row.shuttle_instance_id] = []
            playersByInstance[row.shuttle_instance_id].push(row.player_id)
        }
    }

    const courtShares: Record<number, number> = {}
    const shuttleShares: Record<number, number> = {}
    const courtCharges: SessionChargesPreview['courtCharges'] = []
    const shuttleCharges: SessionChargesPreview['shuttleCharges'] = []

    let courtTotal = 0
    for (const booking of courtBookings) {
        courtTotal += booking.price * booking.quantity
        if (participantIds.length === 0) continue
        const amountPerPlayer = ((booking.price * booking.quantity) / participantIds.length).toFixed(2)
        for (const playerId of participantIds) {
            courtCharges.push({ court_booking_id: booking.court_booking_id, player_id: playerId, amount: amountPerPlayer })
            courtShares[playerId] = (courtShares[playerId] ?? 0) + Number(amountPerPlayer)
        }
    }

    let shuttleTotal = 0
    for (const instance of payableInstances) {
        const shuttle = priceByShuttleId[instance.shuttle_id]
        const pricePerUnit = shuttle.total_price / shuttle.num_of_shuttles
        shuttleTotal += pricePerUnit

        const instancePlayerIds = playersByInstance[instance.shuttle_instance_id] ?? []
        if (instancePlayerIds.length === 0) continue

        const amountPerPlayer = (pricePerUnit / instancePlayerIds.length).toFixed(2)
        for (const playerId of instancePlayerIds) {
            shuttleCharges.push({ shuttle_instance_id: instance.shuttle_instance_id, player_id: playerId, amount: amountPerPlayer })
            shuttleShares[playerId] = (shuttleShares[playerId] ?? 0) + Number(amountPerPlayer)
        }
    }

    const players: PlayerChargePreview[] = participantRows.map((row: any) => {
        const courtShare = roundToCents(courtShares[row.player_id] ?? 0)
        const shuttleShare = roundToCents(shuttleShares[row.player_id] ?? 0)
        return {
            player_id: row.player_id,
            name: row.name,
            avatar_colour: row.avatar_colour,
            matches: row.matches,
            court_share: courtShare,
            shuttle_share: shuttleShare,
            total: roundToCents(courtShare + shuttleShare)
        }
    })

    const shareTotal = roundToCents(
        [...courtCharges, ...shuttleCharges].reduce((sum, charge) => sum + Number(charge.amount), 0)
    )

    return {
        courtTotal: roundToCents(courtTotal),
        shuttleTotal: roundToCents(shuttleTotal),
        shareTotal,
        players,
        courtCharges,
        shuttleCharges
    }
}

export async function closeSession(sessionId: string) {
    const session: any = await db.getFirstAsync(
        `SELECT * FROM sessions WHERE session_id = ?`,
        [sessionId]
    )
    if (!session) throw new Error('Session not found')
    if (session.status !== 'open') throw new Error('Session is already closed')

    const matchCount: any = await db.getFirstAsync(
        `SELECT COUNT(*) AS count FROM matches WHERE session_id = ?`,
        [sessionId]
    )
    if (matchCount.count === 0) {
        throw new Error('Add at least one match before closing this session')
    }

    const preview = await previewSessionCharges(sessionId)

    await db.execAsync("BEGIN TRANSACTION")

    await Promise.all(preview.courtCharges.map((charge) => db.runAsync(
        `INSERT INTO court_payments (court_booking_id, player_id, amount_paid, amount_charged) VALUES (?, ?, ?, ?)`,
        [charge.court_booking_id, charge.player_id, charge.amount, charge.amount]
    )))

    await Promise.all(preview.shuttleCharges.map((charge) => db.runAsync(
        `INSERT INTO shuttle_payments (shuttle_instance_id, player_id, amount_paid, amount_charged) VALUES (?, ?, ?, ?)`,
        [charge.shuttle_instance_id, charge.player_id, charge.amount, charge.amount]
    )))

    await db.runAsync(
        `UPDATE sessions SET status = 'closed', closed_date = datetime('now'), amount_due = ? WHERE session_id = ?`,
        [preview.shareTotal, sessionId]
    )

    await db.execAsync("COMMIT")
}

export async function deleteEmptySession(sessionId: string) {
    const session: any = await db.getFirstAsync(
        `SELECT * FROM sessions WHERE session_id = ?`,
        [sessionId]
    )
    if (!session || session.status !== 'open') throw new Error("This session can't be deleted")

    const matchCount: any = await db.getFirstAsync(
        `SELECT COUNT(*) AS count FROM matches WHERE session_id = ?`,
        [sessionId]
    )
    if (matchCount.count > 0) throw new Error("Sessions with matches can't be deleted")

    await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM court_bookings WHERE session_id = ?`, [sessionId])
        await db.runAsync(`DELETE FROM sessions WHERE session_id = ?`, [sessionId])
    })
}


export async function fetchShuttlePaymentsBySessionId(id: string) {
    const sessionRows = await db.getAllAsync(`
        SELECT

        FROM 
        `
    [id])
}
