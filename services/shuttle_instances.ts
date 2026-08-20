import { openDatabaseSync } from "expo-sqlite"

const db = openDatabaseSync('db.db')

export type ShuttleInstance = {
    shuttle_instance_id: number,
    shuttle_id: number | null,
    label: string
}

export async function fetchShuttleInstancesBySessionId(sessionId: number): Promise<ShuttleInstance[]> {
    const rows: any = await db.getAllAsync(`
        SELECT
        si.shuttle_instance_id,
        si.shuttle_id,
        s.name AS shuttle_name
        FROM shuttle_instances si
        LEFT JOIN shuttles s ON s.shuttle_id = si.shuttle_id
        WHERE si.session_id = ?
        ORDER BY si.shuttle_instance_id ASC
        `, [sessionId])

    const countByShuttle: Record<string, number> = {}

    return rows.map((row: any) => {
        const key = row.shuttle_id === null ? 'free' : String(row.shuttle_id)
        const n = (countByShuttle[key] ?? 0) + 1
        countByShuttle[key] = n

        return {
            shuttle_instance_id: row.shuttle_instance_id,
            shuttle_id: row.shuttle_id,
            label: row.shuttle_id === null ? `Free shuttle #${n}` : `${row.shuttle_name} #${n}`
        }
    })
}
