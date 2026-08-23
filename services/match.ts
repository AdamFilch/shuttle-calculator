import { openDatabaseSync } from "expo-sqlite";

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

    for (const selection of payload.shuttleSelections) {
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

export type MatchFull = {
    session_id: number,
    match_id: number,
    match_number: number,
    date: string
    players: 
        Record<number, {
        players_id: number,
        name: string,
        position: number,
    }>,
    shuttles: {
        shuttle_id: number | null,
        name: string,
        quantity_used: number,
    }[]
}

export async function fetchMatchById(id: string): Promise<MatchFull> {

    const matchRows: any = await db.getAllAsync(`
        SELECT
        m.session_id,
        m.match_id,
        m.match_number,
        m.date,
        si.shuttle_instance_id,
        si.shuttle_id,
        s.name AS shuttle_name,
        mp.player_id,
        mp.position,
        p.name AS player_name
        FROM matches m
        LEFT JOIN match_shuttle_instances msi ON msi.match_id = m.match_id
        LEFT JOIN shuttle_instances si ON si.shuttle_instance_id = msi.shuttle_instance_id
        LEFT JOIN shuttles s ON s.shuttle_id = si.shuttle_id
        LEFT JOIN match_players mp ON mp.match_id = m.match_id
        LEFT JOIN players p ON p.player_id = mp.player_id
        WHERE m.match_id = ?
        `, [id])

    const playersMap: Record<number, any> = {}
    const shuttlesMap: Record<string, { shuttle_id: number | null, name: string, quantity_used: number }> = {}
    // match_shuttle_instances rows are cross-joined against match_players rows above,
    // so the same shuttle_instance_id appears once per player -- dedupe before counting.
    const seenInstances = new Set<number>()

    for (let row of matchRows) {
        if (row.position !== null && !playersMap[row.position]) {
            playersMap[row.position] = {
                player_id: row.player_id,
                name: row.player_name,
                position: row.position
            }
        }

        if (row.shuttle_instance_id !== null && !seenInstances.has(row.shuttle_instance_id)) {
            seenInstances.add(row.shuttle_instance_id)
            const key = row.shuttle_id === null ? 'free' : String(row.shuttle_id)
            if (!shuttlesMap[key]) {
                shuttlesMap[key] = {
                    shuttle_id: row.shuttle_id,
                    name: row.shuttle_id === null ? 'Free' : row.shuttle_name,
                    quantity_used: 0
                }
            }
            shuttlesMap[key].quantity_used += 1
        }
    }

    return {
        session_id: matchRows[0].session_id,
        match_id: matchRows[0].match_id,
        match_number: matchRows[0].match_number,
        date: matchRows[0].date,
        players: playersMap,
        shuttles: Object.values(shuttlesMap)
    }
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