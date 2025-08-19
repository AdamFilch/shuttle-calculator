import * as SQLite from 'expo-sqlite';



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


export async function fetchAllSessions() {
    const db = await SQLite.openDatabaseSync('db.db')
    const res = await db.getAllAsync(`SELECT * FROM sessions`)

    return res
}