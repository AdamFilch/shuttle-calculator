import { openDatabaseSync } from "expo-sqlite";
import { Player } from "./player";

const db = openDatabaseSync('db.db')

export type ShuttleSelection =
    | { mode: 'new', shuttleId: number, quantity: number }
    | { mode: 'reused', shuttleInstanceId: number }
    | { mode: 'free' }

type newMatchPayload = {
    sessionId: number,
    playersId: number[] // TL BL TR BR
    shuttleSelections: ShuttleSelection[]
}

export type Match = {
    session_id: number,
    match_id: number
}


export async function createNewMatch(payload: newMatchPayload) {

    const shuttleSelections: ShuttleSelection[] =
        payload.shuttleSelections.length > 0
            ? payload.shuttleSelections
            : [{ mode: 'free' }]

    const numberOfMatches = await fetchNumberOfMatchesBySessionId(payload.sessionId.toString())

    const matchRes = await db.runAsync(
        `INSERT INTO matches (session_id, match_number) VALUES (?, ?)`,
        [payload.sessionId, numberOfMatches.count]
    );
    const matchId = matchRes.lastInsertRowId;

    await db.execAsync("BEGIN TRANSACTION");

    await Promise.all(payload.playersId.map((playerId, i) => {
        if (!playerId) return Promise.resolve();
        return db.runAsync(
            `INSERT INTO match_players (match_id, player_id, position) VALUES (?, ?, ?)`,
            [matchId, playerId, i]
        );
    }));

    for (const selection of shuttleSelections) {
        if (selection.mode === 'new') {
            for (let i = 0; i < selection.quantity; i++) {
                const instanceRes = await db.runAsync(
                    `INSERT INTO shuttle_instances (session_id, shuttle_id) VALUES (?, ?)`,
                    [payload.sessionId, selection.shuttleId]
                );
                await db.runAsync(
                    `INSERT INTO match_shuttle_instances (match_id, shuttle_instance_id) VALUES (?, ?)`,
                    [matchId, instanceRes.lastInsertRowId]
                );
            }
        } else if (selection.mode === 'reused') {
            await db.runAsync(
                `INSERT INTO match_shuttle_instances (match_id, shuttle_instance_id) VALUES (?, ?)`,
                [matchId, selection.shuttleInstanceId]
            );
        } else {
            const instanceRes = await db.runAsync(
                `INSERT INTO shuttle_instances (session_id, shuttle_id) VALUES (?, ?)`,
                [payload.sessionId, null]
            );
            await db.runAsync(
                `INSERT INTO match_shuttle_instances (match_id, shuttle_instance_id) VALUES (?, ?)`,
                [matchId, instanceRes.lastInsertRowId]
            );
        }
    }

    await db.execAsync("COMMIT");

    return { matchId };
}

export type MatchPlayer = Player & { position: number }

export type MatchShuttleRow = {
    shuttle_id: number | null,
    name: string | null,
    origin: 'new' | 'reused' | 'free',
    from_match_number: number | null,
    quantity: number,
    unit_price: number
}

export type MatchFull = {
    session_id: number,
    match_id: number,
    match_number: number,
    date: string,
    players: MatchPlayer[],
    shuttles: MatchShuttleRow[]
}

const originOrder = { new: 0, reused: 1, free: 2 }

export async function fetchMatchById(id: string): Promise<MatchFull | null> {
    const match: any = await db.getFirstAsync(
        `SELECT session_id, match_id, match_number, date FROM matches WHERE match_id = ?`,
        [id]
    )
    if (!match) return null

    const players: MatchPlayer[] = await db.getAllAsync(`
        SELECT p.player_id, p.name, p.status, p.deleted_date, p.avatar_colour, mp.position
        FROM match_players mp
        JOIN players p ON p.player_id = mp.player_id
        WHERE mp.match_id = ?
        ORDER BY mp.position
        `, [id])

    const instances: any[] = await db.getAllAsync(`
        SELECT
        si.shuttle_id,
        s.name,
        s.total_price * 1.0 / s.num_of_shuttles AS unit_price,
        (SELECT MIN(m2.match_number)
            FROM match_shuttle_instances msi2
            JOIN matches m2 ON m2.match_id = msi2.match_id
            WHERE msi2.shuttle_instance_id = si.shuttle_instance_id) AS first_match_number
        FROM match_shuttle_instances msi
        JOIN shuttle_instances si ON si.shuttle_instance_id = msi.shuttle_instance_id
        LEFT JOIN shuttles s ON s.shuttle_id = si.shuttle_id
        WHERE msi.match_id = ?
        `, [id])

    const rows: Record<string, MatchShuttleRow> = {}
    for (const instance of instances) {
        const free = instance.shuttle_id === null
        const origin = free ? 'free' : instance.first_match_number === match.match_number ? 'new' : 'reused'
        const from_match_number = origin === 'reused' ? instance.first_match_number : null
        const key = `${instance.shuttle_id}|${origin}|${from_match_number}`
        rows[key] ??= {
            shuttle_id: instance.shuttle_id,
            name: free ? null : instance.name,
            origin,
            from_match_number,
            quantity: 0,
            unit_price: free ? 0 : instance.unit_price
        }
        rows[key].quantity += 1
    }

    const shuttles = Object.values(rows).sort((a, b) =>
        originOrder[a.origin] - originOrder[b.origin]
        || (a.from_match_number ?? 0) - (b.from_match_number ?? 0)
        || (a.name ?? '').localeCompare(b.name ?? '')
    )

    return { ...match, players, shuttles }
}


export async function fetchNumberOfMatchesBySessionId(id: string) {
  const rows: any = await db.getFirstAsync(
    `SELECT COUNT(*) as count FROM matches WHERE session_id = ?`,
    [id]
  );

  return rows;
}

export async function fetchAllMatches(): Promise<Match[]> {
    const res: Match[] = await db.getAllAsync(`SELECT * FROM matches`)
    return res
}

export async function fetchMatchesBySessionId(sessionId: string): Promise<Match[]> {
    const res: Match[] = await db.getAllAsync(`SELECT * FROM matches WHERE session_id = ${sessionId}`)
    return res
}