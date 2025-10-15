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
    shuttle_id,
    match_id,
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




export async function fetchShuttlePaymentsByPlayerSessions(id: number) {
  const player: any = await db.getFirstAsync(`SELECT * FROM players WHERE player_id = ?`, [id])

  const shuttlePaymentsByPlayerRows: any = await db.getAllAsync(`
  SELECT
  sp.match_id,
  sp.shuttle_id,
  sp.amount_paid,
  sp.date_created AS shuttle_payment_requested_date,
  sp.date_paid AS shuttle_payment_paid_date,
  m.session_id,
  m.date AS match_date,
  s.name AS session_name,
  s.date AS session_date,
  sh.name AS shuttle_name,
  ms.quantity_used,
  mp.player_id,
  mp.position,
  p.name AS player_name
  FROM shuttle_payments sp
  LEFT JOIN matches m ON sp.match_id = m.match_id
  LEFT JOIN sessions s ON m.match_id = s.session_id
  LEFT JOIN shuttles sh ON sp.shuttle_id = sh.shuttle_id
  LEFT JOIN match_shuttles ms ON sp.match_id = ms.match_id
  LEFT JOIN match_players mp ON sp.match_id = mp.match_id
  LEFT JOIN players p ON mp.player_id = p.player_id
  WHERE sp.player_id = ?
  `, [id])

  const sessionsMap: Record<number, any> = {}
  for (let row of shuttlePaymentsByPlayerRows) {
    let session = sessionsMap[row.session_id]
    if (!session) {
      session = {
        session_id: row.session_id,
        session_date: row.session_date,
        session_name: row.session_name,
        matches_played: {}
      }
      sessionsMap[row.session_id] = session
    }

    if (!sessionsMap[row.session_id].matches_played[row.match_id]) {
      sessionsMap[row.session_id].matches_played[row.match_id] = {
        match_id: row.match_id,
        match_date: row.match_date,
        players: {},
        shuttles: {}
      }
    }

    if (!sessionsMap[row.session_id].matches_played[row.match_id].players[row.player_id]) {
      sessionsMap[row.session_id].matches_played[row.match_id].players[row.player_id] = {
        position: row.position,
        player_name: row.player_name,
        player_id: row.player_name
      }
    }

    if (!sessionsMap[row.session_id].matches_played[row.match_id].shuttles[row.shuttle_id]) {
      sessionsMap[row.session_id].matches_played[row.match_id].shuttles[row.shuttle_id] = {
        shuttle_id: row.shuttle_id,
        shuttle_name: row.shuttle_name,
        quantity_used: row.quantity_used,
        owed_amount: row.amount_paid,
        date_creaetd: row.shuttle_payment_requested_date,
        date_paid: row.shuttle_payment_paid_date
      }
    }
  }

  const sessions = Object.values(sessionsMap).map((s) => ({
    session_id: s.session_id,
    session_date: s.session_date,
    session_name: s.session_name,
    matches_played: Object.values(s.matches_played).map((mp: any) => ({
      match_date: mp.match_date,
      match_id: mp.match_id,
      players: Object.values(mp.players),
      shuttles: Object.values(mp.shuttles)
    }))
  }))

  return {
    ...player,
    sessions
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
      session_date: '',
      session_name: '',
      matches_played: [
        {
          score: '',
          match_date: '',
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