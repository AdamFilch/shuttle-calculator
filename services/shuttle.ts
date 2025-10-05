import { openDatabaseSync } from "expo-sqlite"
import { Float } from "react-native/Libraries/Types/CodegenTypes"

const db = openDatabaseSync('db.db')

export type Shuttle =  {
    shuttle_id: number,
    name: string,
    total_price: Float,
    num_of_shuttles: number    
}

export async function createShuttle({
    name,
    total_price,
    num_of_shuttles
}: {
    name: string,
    total_price: number,
    num_of_shuttles: number
}) {
    const res = await db.runAsync(
        `INSERT into shuttles (name, total_price, num_of_shuttles) VALUES (?, ?, ?)`,
        [name, total_price, num_of_shuttles]
    )

    return res.lastInsertRowId
}

export async function fetchAllShuttles(): Promise<Shuttle[]> {
    const res: Shuttle[] = await db.getAllAsync(`SELECT * FROM shuttles`)

    return res
}

export async function fetchShuttleById(id: number): Promise<Shuttle[]> {
    const res: Shuttle[] = await db.getAllAsync(`SELECT * FROM shuttles WHERE shuttle_id = (?)`, [id])
    return res
}