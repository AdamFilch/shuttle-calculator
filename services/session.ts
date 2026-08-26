import { openDatabaseSync } from "expo-sqlite";
import { CourtBooking, fetchCourtBookingsBySessionId } from "./court";
import { Shuttle } from "./shuttle";
import { DisplayTimeDDDASHMMDASHYYYY } from "./time-display";

export type Session = {
    session_id: number,
    name: string,
    date: string,
    status: 'open' | 'closed',
    closed_date: string | null,
    player_count: number
}

const db = openDatabaseSync('db.db')

export async function createNewSession({
    name,
    date
}: {
    name?: string,
    date: string
}) {
    const finalName = name?.trim() ?? ''

    const res = await db.runAsync(
        `INSERT into sessions (name, date) VALUES (?, ?)`,
        [finalName, date]
    );

    return res.lastInsertRowId
}

export function formatSessionTitle(session: { name: string | null | undefined, date: string }): string {
    const dateLabel = DisplayTimeDDDASHMMDASHYYYY(session.date) ?? ''
    return session.name ? `${session.name} - ${dateLabel}` : dateLabel
}


export async function fetchAllSessions(): Promise<Session[]> {
    const res: Session[] = await db.getAllAsync(`
        SELECT s.*, COUNT(DISTINCT mp.player_id) as player_count
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
        players: {
            name: string,
            player_id: number,
            position: number,
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
        p.name as player_name
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
                playersMap: {},
            }
            matchesMap[row.match_id] = match
        }

        // match_shuttle_instances rows are cross-joined against match_players rows
        // above, so the same shuttle_instance_id appears once per player -- dedupe
        // before counting.
        if (row.shuttle_instance_id !== null && !match.seenInstances.has(row.shuttle_instance_id)) {
            match.seenInstances.add(row.shuttle_instance_id)
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
                position: row.position
            }
        }
    }

    const matches = Object.values(matchesMap).map(m => ({
        match_id: m.match_id,
        match_number: m.match_number,
        match_date: m.match_date,
        shuttles: Object.values(m.shuttlesMap),
        players: Object.values(m.playersMap).sort((player1: { position }, player2: { position }) => player1.position - player2.position)
    }))

    const courts = await fetchCourtBookingsBySessionId(id)

    return {
        ...session,
        matches,
        courts
    }
}

export async function closeSession(sessionId: string) {
    const session: any = await db.getFirstAsync(
        `SELECT * FROM sessions WHERE session_id = ?`,
        [sessionId]
    )
    if (!session) throw new Error('Session not found')
    if (session.status !== 'open') throw new Error('Session is already closed')

    const participantRows: any = await db.getAllAsync(`
        SELECT DISTINCT mp.player_id
        FROM match_players mp
        JOIN matches m ON m.match_id = mp.match_id
        WHERE m.session_id = ?
        `, [sessionId])
    const participantIds: number[] = participantRows.map((r: any) => r.player_id)

    const courtBookings = await fetchCourtBookingsBySessionId(sessionId)

    if (participantIds.length === 0 && courtBookings.length > 0) {
        throw new Error('Add at least one match before closing this session')
    }

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

    await db.execAsync("BEGIN TRANSACTION")

    const payments = []
    for (const booking of courtBookings) {
        const amountPerPlayer = ((booking.price * booking.quantity) / participantIds.length).toFixed(2)
        for (const playerId of participantIds) {
            payments.push(db.runAsync(
                `INSERT INTO court_payments (court_booking_id, player_id, amount_paid) VALUES (?, ?, ?)`,
                [booking.court_booking_id, playerId, amountPerPlayer]
            ))
        }
    }
    await Promise.all(payments)

    const shuttlePayments = []
    for (const instance of payableInstances) {
        const shuttle = priceByShuttleId[instance.shuttle_id]
        const pricePerUnit = shuttle.total_price / shuttle.num_of_shuttles

        const instancePlayerIds = playersByInstance[instance.shuttle_instance_id] ?? []
        if (instancePlayerIds.length === 0) continue

        const amountPerPlayer = (pricePerUnit / instancePlayerIds.length).toFixed(2)
        for (const playerId of instancePlayerIds) {
            shuttlePayments.push(db.runAsync(
                `INSERT INTO shuttle_payments (shuttle_instance_id, player_id, amount_paid) VALUES (?, ?, ?)`,
                [instance.shuttle_instance_id, playerId, amountPerPlayer]
            ))
        }
    }
    await Promise.all(shuttlePayments)

    await db.runAsync(
        `UPDATE sessions SET status = 'closed', closed_date = datetime('now') WHERE session_id = ?`,
        [sessionId]
    )

    await db.execAsync("COMMIT")
}


export async function fetchShuttlePaymentsBySessionId(id: string) {
    const sessionRows = await db.getAllAsync(`
        SELECT

        FROM 
        `
    [id])
}
