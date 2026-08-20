import { openDatabaseSync } from "expo-sqlite";
import { PlayersShuttlePayments, ShuttleInstanceCharge } from "./player";
import { convertTimeToSQLTimeStamp } from "./time-display";

type ShuttlePayment = {

}

const db = openDatabaseSync('db.db')

export async function fetchAllShuttlePayments(): Promise<ShuttlePayment[]> {
    const res: ShuttlePayment[] = await db.getAllAsync(`SELECT * FROM shuttle_payments`)
    return res
}


export async function payShuttleInstancesByIds({
    shuttleCharges,
    player_id
}: {
    shuttleCharges: ShuttleInstanceCharge[],
    player_id: string
}) {
   const today = new Date()

    for (let charge of shuttleCharges) {
        await db.runAsync(`
            UPDATE shuttle_payments
            SET amount_paid = 0, date_paid = ?
            WHERE shuttle_instance_id = ? AND player_id = ?
            `, [convertTimeToSQLTimeStamp(today), charge.shuttle_instance_id, player_id])
    }
}

export async function payShuttleByPlayers({
    players
}: {
    players: PlayersShuttlePayments[]
}) {
    const today = new Date()

    for (let player of players) {
        for (let shuttle of player.shuttle_payments) {
             await db.runAsync(`
                UPDATE shuttle_payments
                SET amount_paid = 0, date_paid = ?
                WHERE shuttle_instance_id = ? AND player_id = ?
                `, [convertTimeToSQLTimeStamp(today), shuttle.shuttle_instance_id, player.player_id])
        }
        for (let court of player.court_payments ?? []) {
            await db.runAsync(`
                UPDATE court_payments
                SET amount_paid = 0, date_paid = ?
                WHERE court_booking_id = ? AND player_id = ?
                `, [convertTimeToSQLTimeStamp(today), court.court_booking_id, player.player_id])
        }
    }
}