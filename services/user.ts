import { openDatabaseSync } from "expo-sqlite";


export type User = {
  user_id: number,
  name: string
}

const db = openDatabaseSync('db.db');

export async function createUser(name: string) {

  const result = await db.runAsync(`
        INSERT into users (name) VALUES (?) 
        `,
    [name]
  )

  return result.lastInsertRowId
}

export async function fetchAllUsers(): Promise<User[]> {
  const res: User[] = await db.getAllAsync('SELECT * FROM users')
  return res
}

export async function fetchUserById(id: string): Promise<User[]> {
  const res: User[] = await db.getAllAsync(`SELECT * FROM users WHERE user_id = (?)`, [id])
  return res
}


export async function recordShuttlePayment(matchId, shuttleId, userId, amount) {
  await db.runAsync(
    `INSERT INTO shuttle_payments (match_id, shuttle_id, user_id, amount_paid) VALUES (?, ?, ?, ?)`,
    [matchId, shuttleId, userId, amount]
  );
}