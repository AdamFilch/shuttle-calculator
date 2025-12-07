import { openDatabaseSync } from "expo-sqlite"

const db = openDatabaseSync('db.db')

export async function fetchAllShuttleInstancesOfShuttle(sessionId: number, shuttleId: number) {
    const rows = await db.getAllAsync(`
        SELECT * FROM shuttle_instances WHERE shuttle_id = ? AND session_id = ?
        `, [shuttleId, sessionId])

    return rows
}


export async function fetchAllShuttleInstances() {
    const res = await db.getAllAsync(`SELECT * FROM shuttle_instances`)
}