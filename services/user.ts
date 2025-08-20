import { openDatabaseSync } from "expo-sqlite";


const db = openDatabaseSync('badminton.db');


export async function createUser(name) {
    const result = await db.runAsync(`
        INSERT into users (name) VALUES (?) 
        `,
        [name]
    )

    return result.lastInsertRowId
}

export async function fetchAllUsers() {
  const res = await db.getAllAsync('SELECT * FROM users')
  return res
}


export async function recordShuttlePayment(matchId, shuttleId, userId, amount) {
  await db.runAsync(
    `INSERT INTO shuttle_payments (match_id, shuttle_id, user_id, amount_paid) VALUES (?, ?, ?, ?)`,
    [matchId, shuttleId, userId, amount]
  );
}