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


export type ShuttlePaymentsByPlayerSessions = Player & {
  sessions: (Session & {
    shuttle_charges: ShuttleInstanceCharge[],
    matches: SessionMatchSummary[],
    shuttle_total_owed: number,
    court_total_owed: number
  })[]
}
export type ShuttleInstanceCharge = {
  shuttle_instance_id: number,
  shuttle_id: number | null,
  session_id: number,
  name: string,
  owed_amount: number,
  date_created: string,
  date_paid: string | null,
  matches_used_in: number[]
}
export type SessionMatchSummary = {
  match_id: number,
  match_number: number,
  date: string,
  players: { player_id: number, name: string, position: number }[],
  charges: ShuttleInstanceCharge[]
}

export async function fetchShuttlePaymentsByPlayerSessions(id: number): Promise<ShuttlePaymentsByPlayerSessions> {
  const player: any = await db.getFirstAsync(`SELECT * FROM players WHERE player_id = ?`, [id])

  const shuttlePaymentsByPlayerRows: any = await db.getAllAsync(`
  SELECT
  sp.shuttle_instance_id,
  sp.amount_paid,
  sp.date_created AS shuttle_payment_requested_date,
  sp.date_paid AS shuttle_payment_paid_date,
  si.session_id,
  si.shuttle_id,
  sh.name AS shuttle_name,
  s.name AS session_name,
  s.date AS session_date
  FROM shuttle_payments sp
  JOIN shuttle_instances si ON si.shuttle_instance_id = sp.shuttle_instance_id
  JOIN sessions s ON s.session_id = si.session_id
  LEFT JOIN shuttles sh ON sh.shuttle_id = si.shuttle_id
  WHERE sp.player_id = ?
  `, [id])

  const courtPaymentsRows: any = await db.getAllAsync(`
  SELECT
  cp.amount_paid,
  cb.session_id,
  s.name AS session_name,
  s.date AS session_date
  FROM court_payments cp
  JOIN court_bookings cb ON cb.court_booking_id = cp.court_booking_id
  JOIN sessions s ON s.session_id = cb.session_id
  WHERE cp.player_id = ?
  `, [id])

  const instanceIds: number[] = shuttlePaymentsByPlayerRows.map((r: any) => r.shuttle_instance_id)
  const matchesByInstance: Record<number, number[]> = {}
  const allMatchIds = new Set<number>()
  if (instanceIds.length > 0) {
    const placeholders = instanceIds.map(() => '?').join(',')
    const matchRows: any = await db.getAllAsync(`
      SELECT shuttle_instance_id, match_id FROM match_shuttle_instances WHERE shuttle_instance_id IN (${placeholders})
      `, instanceIds)
    for (const row of matchRows) {
      if (!matchesByInstance[row.shuttle_instance_id]) matchesByInstance[row.shuttle_instance_id] = []
      matchesByInstance[row.shuttle_instance_id].push(row.match_id)
      allMatchIds.add(row.match_id)
    }
  }

  // Full match info + roster for every match touched by any of this player's shuttle
  // charges -- including matches they didn't personally play in, since a reused
  // shuttle instance can pull in a charge from a match with an entirely different
  // roster (that's the whole point of "reuse").
  const matchInfoById: Record<number, { match_id: number, match_number: number, date: string, players: { player_id: number, name: string, position: number }[] }> = {}
  if (allMatchIds.size > 0) {
    const matchIds = [...allMatchIds]
    const placeholders = matchIds.map(() => '?').join(',')
    const matchInfoRows: any = await db.getAllAsync(`
      SELECT m.match_id, m.match_number, m.date, mp.player_id, mp.position, p.name AS player_name
      FROM matches m
      LEFT JOIN match_players mp ON mp.match_id = m.match_id
      LEFT JOIN players p ON p.player_id = mp.player_id
      WHERE m.match_id IN (${placeholders})
      `, matchIds)
    for (const row of matchInfoRows) {
      if (!matchInfoById[row.match_id]) {
        matchInfoById[row.match_id] = {
          match_id: row.match_id,
          match_number: row.match_number,
          date: row.date,
          players: []
        }
      }
      if (row.player_id !== null) {
        matchInfoById[row.match_id].players.push({
          player_id: row.player_id,
          name: row.player_name,
          position: row.position
        })
      }
    }
  }

  const sessionsMap: Record<number, any> = {}
  const ensureSession = (row: any) => {
    if (!sessionsMap[row.session_id]) {
      sessionsMap[row.session_id] = {
        session_id: row.session_id,
        date: row.session_date,
        name: row.session_name,
        shuttle_charges: [],
        court_total_owed: 0
      }
    }
    return sessionsMap[row.session_id]
  }

  for (let row of shuttlePaymentsByPlayerRows) {
    const session = ensureSession(row)
    session.shuttle_charges.push({
      shuttle_instance_id: row.shuttle_instance_id,
      shuttle_id: row.shuttle_id,
      session_id: row.session_id,
      name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
      owed_amount: row.amount_paid,
      date_created: row.shuttle_payment_requested_date,
      date_paid: row.shuttle_payment_paid_date,
      matches_used_in: matchesByInstance[row.shuttle_instance_id] ?? []
    })
  }

  for (let row of courtPaymentsRows) {
    const session = ensureSession(row)
    session.court_total_owed += row.amount_paid
  }

  const sessions = Object.values(sessionsMap).map((s: any) => {
    const sessionMatchIds = new Set<number>()
    for (const charge of s.shuttle_charges) {
      for (const matchId of charge.matches_used_in) sessionMatchIds.add(matchId)
    }

    const matches: SessionMatchSummary[] = [...sessionMatchIds]
      .map((matchId) => matchInfoById[matchId])
      .filter(Boolean)
      .sort((a, b) => a.match_number - b.match_number)
      .map((info) => ({
        match_id: info.match_id,
        match_number: info.match_number,
        date: info.date,
        players: info.players,
        charges: s.shuttle_charges.filter((c: ShuttleInstanceCharge) => c.matches_used_in.includes(info.match_id))
      }))

    const shuttle_total_owed = s.shuttle_charges.reduce((acc: number, c: ShuttleInstanceCharge) => acc + c.owed_amount, 0)

    return {
      session_id: s.session_id,
      date: s.date,
      name: s.name,
      court_total_owed: s.court_total_owed,
      shuttle_total_owed,
      shuttle_charges: s.shuttle_charges,
      matches
    }
  })

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
    shuttle_id: number | null,
    shuttle_instance_id: number,
    owed_amount: number,
    date_created: string,
    date_paid: string
  }[],
  court_payments: {
    court_booking_id: number,
    label: string | null,
    owed_amount: number,
    date_created: string,
    date_paid: string
  }[]
}

export async function fetchAllPlayerPaymentsBySession(id: string): Promise<PlayersShuttlePayments[]> {
  const shuttlePaymentsByPlayerRows: any = await db.getAllAsync(`
      SELECT
    p.player_id,
    p.name AS player_name,
    sp.shuttle_instance_id,
    sp.amount_paid,
    sp.date_paid,
    sp.date_created,
    si.shuttle_id,
    sh.name AS shuttle_name
    FROM shuttle_payments sp
    JOIN shuttle_instances si ON si.shuttle_instance_id = sp.shuttle_instance_id
    JOIN players p ON p.player_id = sp.player_id
    LEFT JOIN shuttles sh ON sh.shuttle_id = si.shuttle_id
    WHERE si.session_id = ?
      `, [id])

  const courtPaymentsByPlayerRows: any = await db.getAllAsync(`
      SELECT
    p.player_id,
    p.name AS player_name,
    cp.court_booking_id,
    cp.amount_paid,
    cp.date_paid,
    cp.date_created,
    cb.label AS court_label
    FROM court_payments cp
    JOIN court_bookings cb ON cb.court_booking_id = cp.court_booking_id
    JOIN players p ON p.player_id = cp.player_id
    WHERE cb.session_id = ?
      `, [id])

  const playersMap: Record<number, any> = {}

  const ensurePlayer = (playerId: number, playerName: string) => {
    if (!playersMap[playerId]) {
      playersMap[playerId] = {
        player_id: playerId,
        name: playerName,
        total_owed_amount: 0,
        shuttle_payments: [],
        court_payments: []
      }
    }
    return playersMap[playerId]
  }

  for (const row of shuttlePaymentsByPlayerRows) {
    const player = ensurePlayer(row.player_id, row.player_name)
    player.total_owed_amount += row.amount_paid
    player.shuttle_payments.push({
      shuttle_id: row.shuttle_id,
      shuttle_instance_id: row.shuttle_instance_id,
      name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
      owed_amount: row.amount_paid,
      date_created: row.date_created,
      date_paid: row.date_paid
    })
  }

  for (const row of courtPaymentsByPlayerRows) {
    const player = ensurePlayer(row.player_id, row.player_name)
    player.total_owed_amount += row.amount_paid
    player.court_payments.push({
      court_booking_id: row.court_booking_id,
      label: row.court_label,
      owed_amount: row.amount_paid,
      date_created: row.date_created,
      date_paid: row.date_paid
    })
  }

  return Object.values(playersMap)
}

export async function fetchAllPlayerPayments(): Promise<PlayersShuttlePayments[]> {
  const shuttlePaymentsByPlayerRows: any = await db.getAllAsync(`
      SELECT
      p.name AS player_name,
      p.player_id,
      sp.shuttle_instance_id,
      sp.amount_paid,
      sp.date_paid,
      sp.date_created,
      si.shuttle_id,
      sh.name AS shuttle_name
      FROM players p
      LEFT JOIN shuttle_payments sp ON sp.player_id = p.player_id
      LEFT JOIN shuttle_instances si ON si.shuttle_instance_id = sp.shuttle_instance_id
      LEFT JOIN shuttles sh ON sh.shuttle_id = si.shuttle_id
      `)

  const courtPaymentsByPlayerRows: any = await db.getAllAsync(`
      SELECT
      p.player_id,
      cp.court_booking_id,
      cp.amount_paid,
      cp.date_paid,
      cp.date_created,
      cb.label AS court_label
      FROM court_payments cp
      JOIN players p ON p.player_id = cp.player_id
      LEFT JOIN court_bookings cb ON cb.court_booking_id = cp.court_booking_id
      `)

  const playersMap: Record<number, any> = {}
  for (let row of shuttlePaymentsByPlayerRows) {

    let currPlayer = playersMap[row.player_id]
    if (!currPlayer) {
      let thisPlayer = {
        player_id: row.player_id,
        name: row.player_name,
        total_owed_amount: 0,
        shuttle_payments: [],
        court_payments: []
      }
      playersMap[row.player_id] = thisPlayer
    }

    if (playersMap[row.player_id] && row.shuttle_instance_id) {
      playersMap[row.player_id].total_owed_amount += row.amount_paid
      playersMap[row.player_id].shuttle_payments.push({
        shuttle_id: row.shuttle_id,
        shuttle_instance_id: row.shuttle_instance_id,
        name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
        owed_amount: row.amount_paid,
        date_created: row.date_created,
        date_paid: row.date_paid
      })
    }
  }

  for (let row of courtPaymentsByPlayerRows) {
    if (playersMap[row.player_id]) {
      playersMap[row.player_id].total_owed_amount += row.amount_paid
      playersMap[row.player_id].court_payments.push({
        court_booking_id: row.court_booking_id,
        label: row.court_label,
        owed_amount: row.amount_paid,
        date_created: row.date_created,
        date_paid: row.date_paid
      })
    }
  }

  return Object.values(playersMap)
}


