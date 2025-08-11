import { openDatabaseSync } from "expo-sqlite";

const db = await openDatabaseSync('db.db')

export async function createNewSession(name?: string) {
    const res = await db.runAsync(`
    INSERT into sessions (name) VALUES (${name})
    `)

    return res.lastInsertRowId
}


export async function fetchAllSessions() {
    const res = await db.getAllAsync(`SELECT * from sessions`)

    return res
}