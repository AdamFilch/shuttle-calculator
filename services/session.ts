import { openDatabaseSync } from "expo-sqlite";
import { CourtBooking, fetchCourtBookingsBySessionId } from "./court";
import { Shuttle } from "./shuttle";

export type Session = {
    session_id: number,
    name: string,
    date: string,
    status: 'open' | 'closed',
    closed_date: string | null
}

const db = openDatabaseSync('db.db')

export async function createNewSession({
    name,
    date
}: {
    name?: string,
    date: string
}) {
    const res = await db.runAsync(
        `INSERT into sessions (name, date) VALUES (?, ?)`,
        [name ?? null, date]
    );

    return res.lastInsertRowId
}


export async function fetchAllSessions(): Promise<Session[]> {
    const res: Session[] = await db.getAllAsync(`SELECT * FROM sessions`)

    return res
}

export type SessionMatches = Session & {
    matches: {
        match_id: string,
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
        m.date as match_date,
        z.shuttle_id,
        z.quantity_used,
        s.name as shuttle_name,
        s.total_price,
        s.num_of_shuttles,
        mp.player_id,
        mp.position,
        p.name as player_name
        FROM matches m
        LEFT JOIN match_shuttles z ON m.match_id = z.match_id
        LEFT JOIN shuttles s ON z.match_id = s.shuttle_id
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
                match_date: row.match_date,
                shuttlesMap: {}, 
                playersMap: {},
            }
            matchesMap[row.match_id] = match
        }

        if (row.shuttle_id && !match.shuttlesMap[row.shuttle_id]) {
            match.shuttlesMap[row.shuttle_id] = {
                shuttle_id: row.shuttle_id,
                name: row.shuttle_name,
                quantity_used: row.quantity_used,
                total_price: row.total_price,
                num_of_shuttles: row.num_of_shuttles
            }
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
