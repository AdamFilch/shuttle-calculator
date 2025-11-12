import { openDatabaseSync } from "expo-sqlite";
import { Session } from "./session";


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


export type ShuttlePaymentsByPlayerSessions = Player & {
  sessions: (Session & {
    matches_played: MatchesPlayed[]
  })[]
}
export type MatchesPlayed = {
  date: string,
  match_id: number,
  players: Player[],
  shuttles: {
    shuttle_id: number,
    name: String,
    quantity_used: number,
    owed_amount: number,
    date_created: String,
    date_paid: String | null
  }[]
}

export async function fetchShuttlePaymentsByPlayerSessions(id: number): Promise<ShuttlePaymentsByPlayerSessions> {
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
  LEFT JOIN sessions s ON s.session_id = m.session_id
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
        date: row.session_date,
        name: row.session_name,
        matches_played: {}
      }
      sessionsMap[row.session_id] = session
    }

    if (!sessionsMap[row.session_id].matches_played[row.match_id]) {
      sessionsMap[row.session_id].matches_played[row.match_id] = {
        match_id: row.match_id,
        date: row.match_date,
        players: {},
        shuttles: {}
      }
    }

    if (!sessionsMap[row.session_id].matches_played[row.match_id].players[row.player_id]) {
      sessionsMap[row.session_id].matches_played[row.match_id].players[row.player_id] = {
        position: row.position,
        name: row.player_name,
        player_id: row.player_id
      }
    }

    if (!sessionsMap[row.session_id].matches_played[row.match_id].shuttles[row.shuttle_id]) {
      sessionsMap[row.session_id].matches_played[row.match_id].shuttles[row.shuttle_id] = {
        shuttle_id: row.shuttle_id,
        shuttle_name: row.shuttle_name,
        quantity_used: row.quantity_used,
        owed_amount: row.amount_paid,
        date_created: row.shuttle_payment_requested_date,
        date_paid: row.shuttle_payment_paid_date
      }
    }
  }

  const sessions = Object.values(sessionsMap).map((s) => ({
    session_id: s.session_id,
    date: s.date,
    name: s.name,
    matches_played: Object.values(s.matches_played).map((mp: any) => ({
      date: mp.date,
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

export type PlayersShuttlePayments = {
  player_id: string,
  name: string,
  total_owed_amount: number,
  shuttle_payments: {
    name: string,
    shuttle_id: number,
    quantity_used: number,
    owed_amount: number,
    date_created: string,
    date_paid: string
  }[]
}

export async function fetchAllPlayerPayments(): Promise<PlayersShuttlePayments[]> {
  const shuttlePaymentsByPlayerRows: any = await db.getAllAsync(`
      SELECT
      p.name AS player_name,
      p.player_id,
      sp.shuttle_id,
      sp.amount_paid,
      sp.date_paid,
      sp.date_created,
      sh.name AS shuttle_name
      FROM players p
      LEFT JOIN shuttle_payments sp ON sp.player_id = p.player_id
      LEFT JOIN shuttles sh ON sp.shuttle_id = sh.shuttle_id
      `)


  const playersMap: Record<number, any> = {}
  for (let row of shuttlePaymentsByPlayerRows) {

    let currPlayer = playersMap[row.player_id]
    if (!currPlayer) {
      let thisPlayer = {
        player_id: row.player_id,
        name: row.player_name,
        total_owed_amount: 0,
        shuttle_payments: []
      }
      playersMap[row.player_id] = thisPlayer
    }

    if (playersMap[row.player_id] && row.shuttle_id) {
      playersMap[row.player_id].total_owed_amount += row.amount_paid
      playersMap[row.player_id].shuttle_payments.push({
        shuttle_id: row.shuttle_id,
        name: row.shuttle_name,
        owed_amount: row.amount_paid,
        date_created: row.date_created,
        date_paid: row.date_paid
      })
    }
  }

  return Object.values(playersMap)
}


