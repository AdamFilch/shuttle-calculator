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
        s.num_of_shuttles
        FROM matches m
        LEFT JOIN match_shuttles z ON m.match_id = z.match_id
        LEFT JOIN shuttles s ON m.match_id = s.shuttle_id
        WHERE m.session_id = ?
        `, [id])

    const matchesMap: Record<number, any> = {}

    for (let row of matchRows) {
        if (!matchesMap[row.match_id]) {
            matchesMap[row.match_id] = {
                match_id: row.match_id,
                match_date: row.match_date,
                shuttles: []
            }
        }

        if (row.shuttle_id) {
            matchesMap[row.match_id].shuttles.push({
                shuttle_id: row.shuttle_id,
                name: row.shuttle_name,
                total_price: row.total_price,
                num_of_shuttles: row.num_of_shuttles
            })
        }
    }
    
    const matches = Object.values(matchesMap)

    return {
        ...session,
        matches
    }
}
