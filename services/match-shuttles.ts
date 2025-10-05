import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync('db.db')

type MatchShuttle = {
    match_id: string,
    shuttle_id: string,
    quantity: string    
}

export async function fetchAllMatchShuttles(): Promise<MatchShuttle[]> {
   
   const res: MatchShuttle[] = await db.getAllAsync(`SELECT * FROM match_shuttles`)
    return res 
}







