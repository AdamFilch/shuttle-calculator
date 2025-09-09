import { openDatabaseSync } from "expo-sqlite";
import { fetchShuttleById } from "./shuttle";

const db = openDatabaseSync('db.db')

type newMatchPayload = {
    sessionId: string,
    playersId: string[] // TL BL TR BR
    shuttleId: string,
    quantity_used: number
}


export async function createNewMatch(payload: newMatchPayload) {

    const matchRes = await db.runAsync(`
        INSERT into matches (session_id) VALUES (?)` [payload.sessionId]
    )
    const matchId = matchRes.lastInsertRowId


    const _shuttle = await fetchShuttleById(payload.shuttleId)
    const perShuttlePrice = _shuttle[0].total_price / _shuttle[0].num_of_shuttles
        // Do a query to fetch how much each shuttle is worth 
    // const shuttleId
    // const shuttleAmount

    for (let i = 0; i < payload.playersId.length; i++) {
        const matchUsersRes = await db.runAsync(`INSERT into match_users (user_id, position) VALUES (?, ?)`, [payload.playersId[i], i])
        const shuttleRes = await db.runAsync(`
            INSERT into shuttle_payments (match_id, shuttle_id, user_id, amount_paid) VALUES (?, ?, ?, ?)
            `, [matchId, payload.shuttleId, payload.playersId[i], perShuttlePrice * payload.quantity_used])
    }


    const matchShuttleREs = await db.runAsync(`
        INSERT into match_shuttle (match_id, shuttle_id, quantity_used) VALUES (?, ?, ?)
        `, [matchId, payload.shuttleId, payload.quantity_used]
        )


    return {}
}