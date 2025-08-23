import * as SQLite from 'expo-sqlite';

export type session = {
    name: string,
    session_id: number,
    date: string
}


export async function createNewSession({
    name,
    date
}: {
    name?: string,
    date: string
}) {
    const db = await SQLite.openDatabaseSync('db.db')
    const res = await db.runAsync(
        `INSERT into sessions (name, date) VALUES (?, ?)`,
        [name ?? null, date]
    );

    return res.lastInsertRowId
}


export async function fetchAllSessions(): Promise<session[]> {
    const db = await SQLite.openDatabaseSync('db.db')
    const res: session[] = await db.getAllAsync(`SELECT * FROM sessions`)

    return res
}


export async function fetchSessionById(id: string) {
    
}