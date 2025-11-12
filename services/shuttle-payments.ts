import { openDatabaseSync } from "expo-sqlite";
import { MatchesPlayed } from "./player";
import { convertTimeToSQLTimeStamp } from "./time-display";

type ShuttlePayment = {
    
}

const db = openDatabaseSync('db.db')

export async function fetchAllShuttlePayments(): Promise<ShuttlePayment[]> {
    const res: ShuttlePayment[] = await db.getAllAsync(`SELECT * FROM shuttle_payments`)
    return res
}


export async function payShuttleByIds({
    matches,
    player_id
}: {
    matches: MatchesPlayed[],
    player_id: string
}) {
   const today = new Date() 

    for (let match of matches) {
        for (let shuttle of match.shuttles) {
            const res = await db.runAsync(`
                UPDATE shuttle_payments
                SET amount_paid = 0, date_paid = ?
                WHERE match_id = ? AND shuttle_id = ? AND player_id = ? 
                `, [convertTimeToSQLTimeStamp(today), match.match_id, shuttle.shuttle_id, player_id])
        }
    }

    
}