import { openDatabaseSync } from "expo-sqlite"
import { Float } from "react-native/Libraries/Types/CodegenTypes"

const db = openDatabaseSync('db.db')

export type Shuttle = {
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


export type ShuttlesBySession = {
    session_id: number,
    shuttles: {
        shuttle_id: number,
        name: string,
        total_price: number,
        num_of_shuttles: number,
        total_quantity_used: number,
        matches_used_in: {
            match_id: number,
            quantity_used: number
        }[]
    }[]
}

export type ShuttlesBySessionMatches = {
    session_id: number,
    matches: {
        match_id: number,
        total_quantity_used: number,
        shuttles: {
            shuttle_id: number,
            name: string,
            total_price: number,
            num_of_shuttles: number,
            quantity_used: number
        }[]
    }[]
}

type ShuttlesBySessionResult<Invert extends boolean> = Invert extends true ? ShuttlesBySessionMatches : ShuttlesBySession



export async function fetchAllShuttlesBySessionId<Invert extends boolean>(id: string, invert: Invert): Promise<ShuttlesBySessionResult<Invert>> {
    const shuttlesMatchRows: any = await db.getAllAsync(`
        SELECT
        s.name AS shuttle_name,
        s.total_price,
        s.num_of_shuttles,
        ms.shuttle_id,
        ms.quantity_used,
        m.match_id
        FROM matches m
        LEFT JOIN match_shuttles ms ON ms.match_id = m.match_id
        LEFT JOIN shuttles s ON s.shuttle_id = ms.shuttle_id
        WHERE m.session_id = ?
        `, [id])

    if (invert) {
        const matchesMap: Record<number, any> = {}
        for (let row of shuttlesMatchRows) {
            if (!matchesMap[row.match_id]) {
                matchesMap[row.match_id] = {
                    match_id: row.match_id,
                    total_quantity_used: 0,
                    shuttles_used: [] as Array<{ shuttle_id: number, name: string, total_price: number, num_of_shuttles: number, quantity_used: number }>
                }
            }

            matchesMap[row.match_id].total_quantity_used += row.quantity_used

            matchesMap[row.match_id].shuttles_used.push({
                shuttle_id: row.shuttle_id,
                name: row.shuttle_name,
                total_price: row.total_price,
                num_of_shuttles: row.num_of_shuttles,
                quantity_used: row.quantity_used
            })
        }

        return {
            session_id: parseInt(id),
            matches: Object.values(matchesMap)
        } as ShuttlesBySessionResult<Invert>
    }
    const shuttleMap: Record<number, any> = {}
    for (let row of shuttlesMatchRows) {

        if (!shuttleMap[row.shuttle_id]) {
            shuttleMap[row.shuttle_id] = {
                shuttle_id: row.shuttle_id,
                name: row.shuttle_name,
                total_price: row.total_price,
                num_of_shuttles: row.num_of_shuttles,
                total_quantity_used: 0,
                matches_used_in: [] as Array<{ matches_id: number, quantity_used: number }>
            }
        }

        shuttleMap[row.shuttle_id].total_quantity_used += row.quantity_used


        shuttleMap[row.shuttle_id].matches_used_in.push({
            match_id: row.match_id,
            quantity_used: row.quantity_used
        })
    }


    return {
        session_id: parseInt(id),
        shuttles: Object.values(shuttleMap)
    } as ShuttlesBySessionResult<Invert>
}


