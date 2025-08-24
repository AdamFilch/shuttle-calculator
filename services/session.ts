import { openDatabaseSync } from "expo-sqlite";

export type Session = {
    name: string,
    session_id: number,
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


export async function fetchSessionById(id: string): Promise<Session[]> {
    const res: Session[] = await db.getAllAsync(`SELECT * FROM sessions WHERE session_id = (?)`, [id])

    return res
}