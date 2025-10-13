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


export async function fetchShuttlePaymentsByPlayerId(id: number) {

  const player = await db.getFirstAsync(`SELECT * FROM players WHERE player_id = ?`, [id])

  const shuttlePaymentsByPlayerRows: any = await db.getAllAsync(`
    SELECT
    amount_paid,
    date_paid,
    date_created
    FROM shuttle_payments
    WHERE player_id = ?
    `, [id])

  return {
    player_id: player,
    payments: shuttlePaymentsByPlayerRows
  }
}

const playerTotalOwe = {
  player_id: '',
  name: '',
  payments: [
    {
      match_id: '',
      shuttle_id: '',
      owed_amount: '',
      date_created: '',
      date_paid: '',
    }
  ]
}

const playerData = {
  player_id: '',
  player_name: '',
  sessions: [
    {
      session_id: '',
      session_name: '',
      matches_played: [
        {
          score: '',
          players: [
            {
              position: '',
              player_id: '',
              name: '',
            }
          ],
          match_id: '',
          shuttles: [
            {
              shuttle_id: '',
              name: '',
              quantity_used: '',
              owed_amount: '',
              date_created: '',
              date_paid: ''
            }
          ]
        }
      ]
    }
  ]

}