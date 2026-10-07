import { openDatabaseSync } from "expo-sqlite";
import { formatSessionTitle, previewSessionCharges, roundToCents, Session } from "./session";
import type { ChargeKey } from "./shuttle-payments";


export const AVATAR_COLOURS = ['primary', 'clay', 'sage', 'muted'] as const

export type AvatarColour = typeof AVATAR_COLOURS[number]

export type Player = {
  player_id: number,
  name: string,
  status: 'active' | 'deleted',
  deleted_date: string | null,
  avatar_colour: AvatarColour | null
}

const db = openDatabaseSync('db.db');

export async function createPlayer(name: string) {
  const existing = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM players`)
  const avatarColour = AVATAR_COLOURS[(existing?.count ?? 0) % AVATAR_COLOURS.length]

  const result = await db.runAsync(`
        INSERT into players (name, avatar_colour) VALUES (?, ?)
        `,
    [name, avatarColour]
  )

  return result.lastInsertRowId
}

export async function fetchAllPlayers(): Promise<Player[]> {
  const res: Player[] = await db.getAllAsync(`SELECT * FROM players WHERE status = 'active'`)
  return res
}

export async function fetchPlayerById(id: string): Promise<Player[]> {
  const res: Player[] = await db.getAllAsync(`SELECT * FROM players WHERE player_id = (?)`, [id])
  return res
}

export async function fetchDeletedPlayers(): Promise<Player[]> {
  const res: Player[] = await db.getAllAsync(`SELECT * FROM players WHERE status = 'deleted' ORDER BY deleted_date DESC`)
  return res
}

export type PlayerDeleteBlockers = {
  owed: number,
  inOpenSession: boolean
}

export async function fetchPlayerDeleteBlockers(playerId: number): Promise<PlayerDeleteBlockers> {
  const row = await db.getFirstAsync<{ total_owed: number, open_count: number }>(`
    SELECT
      COALESCE((SELECT SUM(amount_paid) FROM shuttle_payments WHERE player_id = ?), 0) +
      COALESCE((SELECT SUM(amount_paid) FROM court_payments WHERE player_id = ?), 0) AS total_owed,
      (SELECT COUNT(*) FROM match_players mp
        JOIN matches m ON m.match_id = mp.match_id
        JOIN sessions s ON s.session_id = m.session_id
        WHERE mp.player_id = ? AND s.status = 'open') AS open_count
    `, [playerId, playerId, playerId])

  return {
    owed: row?.total_owed ?? 0,
    inOpenSession: (row?.open_count ?? 0) > 0
  }
}

export async function deletePlayer(playerId: number) {
  const blockers = await fetchPlayerDeleteBlockers(playerId)

  if (blockers.owed > 0) {
    throw new Error('This player has unpaid charges. Settle their balance before deleting.')
  }
  if (blockers.inOpenSession) {
    throw new Error('This player is in an open session. Close it before deleting.')
  }

  await db.runAsync(`
    UPDATE players SET status = 'deleted', deleted_date = datetime('now') WHERE player_id = ?
    `, [playerId])
}

export async function restorePlayer(playerId: number) {
  await db.runAsync(`
    UPDATE players SET status = 'active', deleted_date = NULL WHERE player_id = ?
    `, [playerId])
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
  total_charged_amount: number,
  total_paid_amount: number,
  shuttle_payments: {
    name: string,
    shuttle_id: number | null,
    shuttle_instance_id: number,
    owed_amount: number,
    amount_charged: number,
    date_created: string,
    date_paid: string
  }[],
  court_payments: {
    court_booking_id: number,
    label: string | null,
    owed_amount: number,
    amount_charged: number,
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
    sp.amount_charged,
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
    cp.amount_charged,
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
        total_charged_amount: 0,
        total_paid_amount: 0,
        shuttle_payments: [],
        court_payments: []
      }
    }
    return playersMap[playerId]
  }

  for (const row of shuttlePaymentsByPlayerRows) {
    const player = ensurePlayer(row.player_id, row.player_name)
    player.total_owed_amount += row.amount_paid
    player.total_charged_amount += row.amount_charged
    if (row.date_paid) player.total_paid_amount += row.amount_charged
    player.shuttle_payments.push({
      shuttle_id: row.shuttle_id,
      shuttle_instance_id: row.shuttle_instance_id,
      name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
      owed_amount: row.amount_paid,
      amount_charged: row.amount_charged,
      date_created: row.date_created,
      date_paid: row.date_paid
    })
  }

  for (const row of courtPaymentsByPlayerRows) {
    const player = ensurePlayer(row.player_id, row.player_name)
    player.total_owed_amount += row.amount_paid
    player.total_charged_amount += row.amount_charged
    if (row.date_paid) player.total_paid_amount += row.amount_charged
    player.court_payments.push({
      court_booking_id: row.court_booking_id,
      label: row.court_label,
      owed_amount: row.amount_paid,
      amount_charged: row.amount_charged,
      date_created: row.date_created,
      date_paid: row.date_paid
    })
  }

  return Object.values(playersMap)
}

export type PlayerSummary = PlayersShuttlePayments & {
  avatar_colour: AvatarColour | null,
  session_count: number
}

export async function fetchAllPlayerPayments(): Promise<PlayerSummary[]> {
  const shuttlePaymentsByPlayerRows: any = await db.getAllAsync(`
      SELECT
      p.name AS player_name,
      p.player_id,
      p.avatar_colour,
      sp.shuttle_instance_id,
      sp.amount_paid,
      sp.amount_charged,
      sp.date_paid,
      sp.date_created,
      si.shuttle_id,
      sh.name AS shuttle_name
      FROM players p
      LEFT JOIN shuttle_payments sp ON sp.player_id = p.player_id
      LEFT JOIN shuttle_instances si ON si.shuttle_instance_id = sp.shuttle_instance_id
      LEFT JOIN shuttles sh ON sh.shuttle_id = si.shuttle_id
      WHERE p.status = 'active'
      `)

  const courtPaymentsByPlayerRows: any = await db.getAllAsync(`
      SELECT
      p.player_id,
      cp.court_booking_id,
      cp.amount_paid,
      cp.amount_charged,
      cp.date_paid,
      cp.date_created,
      cb.label AS court_label
      FROM court_payments cp
      JOIN players p ON p.player_id = cp.player_id
      LEFT JOIN court_bookings cb ON cb.court_booking_id = cp.court_booking_id
      `)

  const sessionCountRows: { player_id: number, session_count: number }[] = await db.getAllAsync(`
      SELECT mp.player_id, COUNT(DISTINCT m.session_id) AS session_count
      FROM match_players mp
      JOIN matches m ON m.match_id = mp.match_id
      GROUP BY mp.player_id
      `)
  const sessionCountByPlayer: Record<number, number> = {}
  for (const row of sessionCountRows) {
    sessionCountByPlayer[row.player_id] = row.session_count
  }

  const playersMap: Record<number, any> = {}
  for (let row of shuttlePaymentsByPlayerRows) {

    let currPlayer = playersMap[row.player_id]
    if (!currPlayer) {
      let thisPlayer = {
        player_id: row.player_id,
        name: row.player_name,
        avatar_colour: row.avatar_colour,
        session_count: sessionCountByPlayer[row.player_id] ?? 0,
        total_owed_amount: 0,
        total_charged_amount: 0,
        total_paid_amount: 0,
        shuttle_payments: [],
        court_payments: []
      }
      playersMap[row.player_id] = thisPlayer
    }

    if (playersMap[row.player_id] && row.shuttle_instance_id) {
      playersMap[row.player_id].total_owed_amount += row.amount_paid
      playersMap[row.player_id].total_charged_amount += row.amount_charged
      if (row.date_paid) playersMap[row.player_id].total_paid_amount += row.amount_charged
      playersMap[row.player_id].shuttle_payments.push({
        shuttle_id: row.shuttle_id,
        shuttle_instance_id: row.shuttle_instance_id,
        name: row.shuttle_id === null ? 'Free shuttle' : row.shuttle_name,
        owed_amount: row.amount_paid,
        amount_charged: row.amount_charged,
        date_created: row.date_created,
        date_paid: row.date_paid
      })
    }
  }

  for (let row of courtPaymentsByPlayerRows) {
    if (playersMap[row.player_id]) {
      playersMap[row.player_id].total_owed_amount += row.amount_paid
      playersMap[row.player_id].total_charged_amount += row.amount_charged
      if (row.date_paid) playersMap[row.player_id].total_paid_amount += row.amount_charged
      playersMap[row.player_id].court_payments.push({
        court_booking_id: row.court_booking_id,
        label: row.court_label,
        owed_amount: row.amount_paid,
        amount_charged: row.amount_charged,
        date_created: row.date_created,
        date_paid: row.date_paid
      })
    }
  }

  return Object.values(playersMap)
}




export type LedgerShuttleCharge = {
  key: ChargeKey,
  shuttle_instance_id: number,
  shuttleName: string,
  unitPrice: number,
  playerCount: number,
  firstMatchId: number,
  reused: boolean,
  owed: number,
  charged: number,
  datePaid: string | null
}

export type LedgerCourtShare = {
  key: ChargeKey,
  owed: number,
  charged: number,
  datePaid: string | null,
  courtTotal: number,
  playerCount: number
}

export type LedgerMatch = {
  match_id: number,
  match_number: number,
  players: { player_id: number, name: string, position: number }[],
  charges: LedgerShuttleCharge[],
  freeOnly: boolean
}

export type LedgerSessionState = 'owing' | 'open' | 'settled'

export type LedgerSession = {
  session_id: number,
  name: string,
  date: string,
  status: 'open' | 'closed',
  title: string,
  state: LedgerSessionState,
  owed: number,
  paid: number,
  charged: number,
  matches: LedgerMatch[],
  court: LedgerCourtShare | null,
  estimate?: {
    total: number,
    courtShare: number,
    shuttleShares: Record<number, number>
  }
}

export type PlayerLedger = {
  player: Player,
  sessionCount: number,
  matchCount: number,
  totals: {
    owed: number,
    paid: number,
    charged: number,
    sessionsOwing: number,
    closedSessions: number
  },
  sessions: LedgerSession[]
}

const LEDGER_STATE_ORDER: Record<LedgerSessionState, number> = { owing: 0, open: 1, settled: 2 }

export async function fetchPlayerLedger(playerId: number): Promise<PlayerLedger> {
  const player = await db.getFirstAsync<Player>(`SELECT * FROM players WHERE player_id = ?`, [playerId])
  if (!player) throw new Error('Player not found')

  const sessionRows = await db.getAllAsync<{ session_id: number, name: string, date: string, status: 'open' | 'closed' }>(`
    SELECT DISTINCT s.session_id, s.name, s.date, s.status
    FROM sessions s
    JOIN matches m ON m.session_id = s.session_id
    JOIN match_players mp ON mp.match_id = m.match_id
    WHERE mp.player_id = ?
    `, [playerId])

  const emptyTotals = { owed: 0, paid: 0, charged: 0, sessionsOwing: 0, closedSessions: 0 }
  if (sessionRows.length === 0) {
    return { player, sessionCount: 0, matchCount: 0, totals: emptyTotals, sessions: [] }
  }

  const sessionIds = sessionRows.map((row) => row.session_id)
  const sessionPlaceholders = sessionIds.map(() => '?').join(',')

  const playedMatchRows = await db.getAllAsync<{ match_id: number, match_number: number, session_id: number }>(`
    SELECT m.match_id, m.match_number, m.session_id
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.match_id
    WHERE mp.player_id = ?
    ORDER BY m.session_id, m.match_number
    `, [playerId])
  const playedMatchIds = playedMatchRows.map((row) => row.match_id)
  const matchPlaceholders = playedMatchIds.map(() => '?').join(',')

  const rosterRows = await db.getAllAsync<{ match_id: number, player_id: number, name: string, position: number }>(`
    SELECT mp.match_id, mp.player_id, p.name, mp.position
    FROM match_players mp
    JOIN players p ON p.player_id = mp.player_id
    WHERE mp.match_id IN (${matchPlaceholders})
    ORDER BY mp.match_id, mp.position
    `, playedMatchIds)

  const matchInstanceRows = await db.getAllAsync<{ match_id: number, shuttle_instance_id: number, shuttle_id: number | null }>(`
    SELECT msi.match_id, msi.shuttle_instance_id, si.shuttle_id
    FROM match_shuttle_instances msi
    JOIN shuttle_instances si ON si.shuttle_instance_id = msi.shuttle_instance_id
    WHERE msi.match_id IN (${matchPlaceholders})
    `, playedMatchIds)

  const instanceIds = [...new Set(matchInstanceRows.filter((row) => row.shuttle_id !== null).map((row) => row.shuttle_instance_id))]
  const instancePlaceholders = instanceIds.map(() => '?').join(',')

  const instanceInfoRows = instanceIds.length === 0 ? [] : await db.getAllAsync<{
    shuttle_instance_id: number,
    session_id: number,
    shuttle_name: string,
    total_price: number,
    num_of_shuttles: number,
    match_count: number,
    player_count: number
  }>(`
    SELECT si.shuttle_instance_id, si.session_id, sh.name AS shuttle_name, sh.total_price, sh.num_of_shuttles,
      (SELECT COUNT(DISTINCT msi.match_id) FROM match_shuttle_instances msi WHERE msi.shuttle_instance_id = si.shuttle_instance_id) AS match_count,
      (SELECT COUNT(DISTINCT mp.player_id) FROM match_shuttle_instances msi JOIN match_players mp ON mp.match_id = msi.match_id WHERE msi.shuttle_instance_id = si.shuttle_instance_id) AS player_count
    FROM shuttle_instances si
    JOIN shuttles sh ON sh.shuttle_id = si.shuttle_id
    WHERE si.shuttle_instance_id IN (${instancePlaceholders})
    `, instanceIds)

  const shuttlePaymentRows = await db.getAllAsync<{ shuttle_instance_id: number, amount_paid: number, amount_charged: number, date_paid: string | null }>(`
    SELECT sp.shuttle_instance_id, sp.amount_paid, sp.amount_charged, sp.date_paid
    FROM shuttle_payments sp
    WHERE sp.player_id = ?
    `, [playerId])

  const courtPaymentRows = await db.getAllAsync<{ session_id: number, amount_paid: number, amount_charged: number, date_paid: string | null }>(`
    SELECT cb.session_id, cp.amount_paid, cp.amount_charged, cp.date_paid
    FROM court_payments cp
    JOIN court_bookings cb ON cb.court_booking_id = cp.court_booking_id
    WHERE cp.player_id = ? AND cb.session_id IN (${sessionPlaceholders})
    `, [playerId, ...sessionIds])

  const courtTotalRows = await db.getAllAsync<{ session_id: number, court_total: number }>(`
    SELECT session_id, SUM(price * quantity) AS court_total
    FROM court_bookings
    WHERE session_id IN (${sessionPlaceholders})
    GROUP BY session_id
    `, sessionIds)

  const sessionPlayerRows = await db.getAllAsync<{ session_id: number, player_count: number }>(`
    SELECT m.session_id, COUNT(DISTINCT mp.player_id) AS player_count
    FROM matches m
    JOIN match_players mp ON mp.match_id = m.match_id
    WHERE m.session_id IN (${sessionPlaceholders})
    GROUP BY m.session_id
    `, sessionIds)

  const rosterByMatch: Record<number, LedgerMatch['players']> = {}
  for (const row of rosterRows) {
    if (!rosterByMatch[row.match_id]) rosterByMatch[row.match_id] = []
    rosterByMatch[row.match_id].push({ player_id: row.player_id, name: row.name, position: row.position })
  }

  const matchNumberById: Record<number, number> = {}
  for (const row of playedMatchRows) matchNumberById[row.match_id] = row.match_number

  const instancesByMatch: Record<number, { shuttle_instance_id: number, shuttle_id: number | null }[]> = {}
  const firstMatchByInstance: Record<number, number> = {}
  for (const row of matchInstanceRows) {
    if (!instancesByMatch[row.match_id]) instancesByMatch[row.match_id] = []
    instancesByMatch[row.match_id].push(row)
    if (row.shuttle_id === null) continue
    const current = firstMatchByInstance[row.shuttle_instance_id]
    if (current === undefined || matchNumberById[row.match_id] < matchNumberById[current]) {
      firstMatchByInstance[row.shuttle_instance_id] = row.match_id
    }
  }

  const instanceInfoById: Record<number, typeof instanceInfoRows[number]> = {}
  for (const row of instanceInfoRows) instanceInfoById[row.shuttle_instance_id] = row

  const shuttlePaymentByInstance: Record<number, typeof shuttlePaymentRows[number]> = {}
  for (const row of shuttlePaymentRows) shuttlePaymentByInstance[row.shuttle_instance_id] = row

  const courtRowsBySession: Record<number, typeof courtPaymentRows> = {}
  for (const row of courtPaymentRows) {
    if (!courtRowsBySession[row.session_id]) courtRowsBySession[row.session_id] = []
    courtRowsBySession[row.session_id].push(row)
  }

  const courtTotalBySession: Record<number, number> = {}
  for (const row of courtTotalRows) courtTotalBySession[row.session_id] = row.court_total

  const playerCountBySession: Record<number, number> = {}
  for (const row of sessionPlayerRows) playerCountBySession[row.session_id] = row.player_count

  const sessions: LedgerSession[] = []
  for (const sessionRow of sessionRows) {
    const isOpen = sessionRow.status === 'open'
    let owed = 0
    let paid = 0
    let charged = 0

    const matches: LedgerMatch[] = playedMatchRows
      .filter((row) => row.session_id === sessionRow.session_id)
      .map((matchRow) => {
        const instances = instancesByMatch[matchRow.match_id] ?? []
        const charges: LedgerShuttleCharge[] = instances
          .filter((instance) => instance.shuttle_id !== null && firstMatchByInstance[instance.shuttle_instance_id] === matchRow.match_id)
          .map((instance) => {
            const info = instanceInfoById[instance.shuttle_instance_id]
            const payment = shuttlePaymentByInstance[instance.shuttle_instance_id]
            const chargeOwed = isOpen || !payment ? 0 : payment.amount_paid
            const chargeCharged = isOpen || !payment ? 0 : payment.amount_charged
            const datePaid = isOpen || !payment ? null : payment.date_paid
            owed += chargeOwed
            charged += chargeCharged
            if (datePaid) paid += chargeCharged
            return {
              key: `shuttle:${instance.shuttle_instance_id}` as ChargeKey,
              shuttle_instance_id: instance.shuttle_instance_id,
              shuttleName: info.shuttle_name,
              unitPrice: roundToCents(info.total_price / info.num_of_shuttles),
              playerCount: info.player_count,
              firstMatchId: matchRow.match_id,
              reused: info.match_count > 1,
              owed: roundToCents(chargeOwed),
              charged: roundToCents(chargeCharged),
              datePaid
            }
          })
          .sort((a, b) => a.shuttle_instance_id - b.shuttle_instance_id)

        return {
          match_id: matchRow.match_id,
          match_number: matchRow.match_number,
          players: rosterByMatch[matchRow.match_id] ?? [],
          charges,
          freeOnly: instances.length > 0 && instances.every((instance) => instance.shuttle_id === null)
        }
      })

    const courtTotal = courtTotalBySession[sessionRow.session_id]
    let court: LedgerCourtShare | null = null
    if (courtTotal !== undefined) {
      const courtRows = isOpen ? [] : (courtRowsBySession[sessionRow.session_id] ?? [])
      const courtOwed = courtRows.reduce((sum, row) => sum + row.amount_paid, 0)
      const courtCharged = courtRows.reduce((sum, row) => sum + row.amount_charged, 0)
      const courtPaid = courtRows.reduce((sum, row) => sum + (row.date_paid ? row.amount_charged : 0), 0)
      const allPaid = courtRows.length > 0 && courtRows.every((row) => row.date_paid)
      owed += courtOwed
      charged += courtCharged
      paid += courtPaid
      court = {
        key: `court:${sessionRow.session_id}` as ChargeKey,
        owed: roundToCents(courtOwed),
        charged: roundToCents(courtCharged),
        datePaid: allPaid ? courtRows.map((row) => row.date_paid as string).sort().at(-1) ?? null : null,
        courtTotal: roundToCents(courtTotal),
        playerCount: playerCountBySession[sessionRow.session_id] ?? 0
      }
    }

    owed = roundToCents(owed)
    const state: LedgerSessionState = isOpen ? 'open' : owed > 0 ? 'owing' : 'settled'

    const session: LedgerSession = {
      session_id: sessionRow.session_id,
      name: sessionRow.name,
      date: sessionRow.date,
      status: sessionRow.status,
      title: formatSessionTitle(sessionRow),
      state,
      owed,
      paid: roundToCents(paid),
      charged: roundToCents(charged),
      matches,
      court
    }

    if (isOpen) {
      const preview = await previewSessionCharges(String(sessionRow.session_id))
      const previewRow = preview.players.find((row) => row.player_id === playerId)
      const shuttleShares: Record<number, number> = {}
      for (const charge of preview.shuttleCharges) {
        if (charge.player_id === playerId) shuttleShares[charge.shuttle_instance_id] = Number(charge.amount)
      }
      session.estimate = {
        total: previewRow?.total ?? 0,
        courtShare: previewRow?.court_share ?? 0,
        shuttleShares
      }
    }

    sessions.push(session)
  }

  sessions.sort((a, b) =>
    LEDGER_STATE_ORDER[a.state] - LEDGER_STATE_ORDER[b.state]
    || b.date.localeCompare(a.date)
    || b.session_id - a.session_id
  )

  const closed = sessions.filter((session) => session.status === 'closed')
  const totals = {
    owed: roundToCents(closed.reduce((sum, session) => sum + session.owed, 0)),
    paid: roundToCents(closed.reduce((sum, session) => sum + session.paid, 0)),
    charged: roundToCents(closed.reduce((sum, session) => sum + session.charged, 0)),
    sessionsOwing: closed.filter((session) => session.state === 'owing').length,
    closedSessions: closed.length
  }

  return {
    player,
    sessionCount: sessions.length,
    matchCount: playedMatchRows.length,
    totals,
    sessions
  }
}
