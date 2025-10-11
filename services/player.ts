import { openDatabaseSync } from "expo-sqlite";


export type Player = {
  player_id: number,
  name: string
}

const db = openDatabaseSync('db.db');

export async function createPlayer(name: string) {

  const result = await db.runAsync(`
        INSERT into players (name) VALUES (?) 
        `,
    [name]
  )

  return result.lastInsertRowId
}

export async function fetchAllPlayers(): Promise<Player[]> {
  const res: Player[] = await db.getAllAsync('SELECT * FROM players')
  return res
}

export async function fetchPlayerById(id: string): Promise<Player[]> {
  const res: Player[] = await db.getAllAsync(`SELECT * FROM players WHERE player_id = (?)`, [id])
  return res
}


export async function recordShuttlePayment(matchId, shuttleId, playerId, amount) {
  await db.runAsync(
    `INSERT INTO shuttle_payments (match_id, shuttle_id, player_id, amount_paid) VALUES (?, ?, ?, ?)`,
    [matchId, shuttleId, playerId, amount]
  );
}