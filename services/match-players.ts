import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync('db.db')

type MatchPlayer ={
    match_id: string,
    player_id: string,
    position: string
}

export async function fetchAllMatchPlayers(): Promise<MatchPlayer[]> {
    const res: MatchPlayer[] = await db.getAllAsync(`SELECT * FROM match_players`)
    return res
}


