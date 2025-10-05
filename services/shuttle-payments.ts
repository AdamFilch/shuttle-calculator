import { openDatabaseSync } from "expo-sqlite";

type ShuttlePayment = {
    
}

const db = openDatabaseSync('db.db')

export async function fetchAllShuttlePayments(): Promise<ShuttlePayment[]> {
    const res: ShuttlePayment[] = await db.getAllAsync(`SELECT * FROM shuttle_payments`)
    return res
}