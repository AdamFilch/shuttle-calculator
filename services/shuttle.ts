import { openDatabaseSync } from "expo-sqlite"

const db = openDatabaseSync('db.db')
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

export async function fetchAllShuttles() {
    const res = await db.getAllAsync(`SELECT * FROM shuttles`)

    return res
}