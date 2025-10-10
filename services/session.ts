import { openDatabaseSync } from "expo-sqlite";
import { Shuttle } from "./shuttle";

export type Session = {
    session_id: number,
    name: string,
    date: string
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
        shuttles: Shuttle[]
    }[]
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
        p.user_id,
        p.position,
        u.name as player_name
        FROM matches m
        LEFT JOIN match_shuttles z ON m.match_id = z.match_id
        LEFT JOIN shuttles s ON z.match_id = s.shuttle_id
        LEFT JOIN match_users p ON m.match_id = p.match_id
        LEFT JOIN users u ON p.user_id = u.user_id
        WHERE m.session_id = ?
        `, [id])

    const matchesMap: Record<number, any> = {}
    for (const row of matchRows) {
        let match = matchesMap[row.match_id]
        if (!match) {
            match = {
                match_id: row.match_id,
                match_date: row.match_date,
                shuttlesMap: {}, // internal maps for quick deduplication
                playersMap: {},
            }
            matchesMap[row.match_id] = match
        }

        // Shuttle deduplication using map
        if (row.shuttle_id && !match.shuttlesMap[row.shuttle_id]) {
            match.shuttlesMap[row.shuttle_id] = {
                shuttle_id: row.shuttle_id,
                name: row.shuttle_name,
                quantity_used: row.quantity_used,
                total_price: row.total_price,
                num_of_shuttles: row.num_of_shuttles
            }
        }

        // Player deduplication using map
        if (row.user_id && !match.playersMap[row.user_id]) {
            match.playersMap[row.user_id] = {
                user_id: row.user_id,
                name: row.user_name,
                position: row.position
            }
        }
    }

    // Convert maps → clean arrays
    const matches = Object.values(matchesMap).map(m => ({
        match_id: m.match_id,
        match_date: m.match_date,
        shuttles: Object.values(m.shuttlesMap),
        players: Object.values(m.playersMap)
    }))

    return {
        ...session,
        matches
    }
}
