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
        shuttle_id: number | null,
        name: string,
        total_price: number,
        num_of_shuttles: number | null,
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
            shuttle_id: number | null,
            name: string,
            total_price: number,
            num_of_shuttles: number | null,
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
        si.shuttle_id,
        si.shuttle_instance_id,
        m.match_id
        FROM matches m
        LEFT JOIN match_shuttle_instances msi ON msi.match_id = m.match_id
        LEFT JOIN shuttle_instances si ON si.shuttle_instance_id = msi.shuttle_instance_id
        LEFT JOIN shuttles s ON s.shuttle_id = si.shuttle_id
        WHERE m.session_id = ?
        `, [id])

    // Each row is one shuttle instance used in one match -- bucket by shuttle_id (or
    // 'free' for shuttle_id IS NULL) and count instances per match to reconstruct the
    // old "quantity_used" the aggregate match_shuttles table used to store directly.
    const buckets: Record<string, {
        shuttle_id: number | null,
        name: string,
        total_price: number,
        num_of_shuttles: number | null,
        matchCounts: Record<number, number>
    }> = {}

    for (const row of shuttlesMatchRows) {
        if (row.shuttle_instance_id === null) continue

        const key = row.shuttle_id === null ? 'free' : String(row.shuttle_id)
        if (!buckets[key]) {
            buckets[key] = {
                shuttle_id: row.shuttle_id,
                name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
                total_price: row.shuttle_id === null ? 0 : row.total_price,
                num_of_shuttles: row.shuttle_id === null ? null : row.num_of_shuttles,
                matchCounts: {}
            }
        }
        buckets[key].matchCounts[row.match_id] = (buckets[key].matchCounts[row.match_id] ?? 0) + 1
    }

    if (invert) {
        const matchesMap: Record<number, any> = {}
        for (const bucket of Object.values(buckets)) {
            for (const [matchIdStr, quantity_used] of Object.entries(bucket.matchCounts)) {
                const matchId = Number(matchIdStr)
                if (!matchesMap[matchId]) {
                    matchesMap[matchId] = {
                        match_id: matchId,
                        total_quantity_used: 0,
                        shuttles_used: [] as Array<{ shuttle_id: number | null, name: string, total_price: number, num_of_shuttles: number | null, quantity_used: number }>
                    }
                }

                matchesMap[matchId].total_quantity_used += quantity_used
                matchesMap[matchId].shuttles_used.push({
                    shuttle_id: bucket.shuttle_id,
                    name: bucket.name,
                    total_price: bucket.total_price,
                    num_of_shuttles: bucket.num_of_shuttles,
                    quantity_used
                })
            }
        }

        return {
            session_id: parseInt(id),
            matches: Object.values(matchesMap)
        } as ShuttlesBySessionResult<Invert>
    }

    const shuttles = Object.values(buckets).map((bucket) => {
        const matches_used_in = Object.entries(bucket.matchCounts).map(([matchIdStr, quantity_used]) => ({
            match_id: Number(matchIdStr),
            quantity_used
        }))
        const total_quantity_used = matches_used_in.reduce((acc, m) => acc + m.quantity_used, 0)

        return {
            shuttle_id: bucket.shuttle_id,
            name: bucket.name,
            total_price: bucket.total_price,
            num_of_shuttles: bucket.num_of_shuttles,
            total_quantity_used,
            matches_used_in
        }
    })

    return {
        session_id: parseInt(id),
        shuttles
    } as ShuttlesBySessionResult<Invert>
}


