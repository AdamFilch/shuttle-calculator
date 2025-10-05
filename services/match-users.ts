import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync('db.db')

type MatchUser ={
    match_id: string,
    user_id: string,
    position: string
}

export async function fetchAllMatchUsers(): Promise<MatchUser[]> {
    const res: MatchUser[] = await db.getAllAsync(`SELECT * FROM match_users`)
    return res
}


