import { openDatabaseSync } from "expo-sqlite";
import { fetchShuttleById } from "./shuttle";

const db = openDatabaseSync('db.db')

type newMatchPayload = {
    sessionId: number,
    playersId: number[] // TL BL TR BR
    shuttles: createNewMatchShuttle[]
}

export type createNewMatchShuttle = {
    shuttleId: number,
    quantityUsed: number,
    condition: ShuttleCondition
}

export type ShuttleCondition = "New" | "Reused" | "Random"

export type Match = {
    session_id: number,
    match_id: number
}


export async function createNewMatch(payload: newMatchPayload) {
    const matchRes = await db.runAsync(
        `INSERT INTO matches (session_id) VALUES (?)`,
        [payload.sessionId]
    );
    const matchId = matchRes.lastInsertRowId;

    const shuttleData = await Promise.all(payload.shuttles.map(async s => {
        const [res] = await fetchShuttleById(s.shuttleId);
        return { ...s, ...res, pricePerUnit: res.total_price / res.num_of_shuttles };
    }));

    await db.execAsync("BEGIN TRANSACTION");

    await Promise.all(payload.playersId.map((playerId, i) => {
        if (!playerId) return Promise.resolve();
        return db.runAsync(
            `INSERT INTO match_players (match_id, player_id, position) VALUES (?, ?, ?)`,
            [matchId, playerId, i]
        );
    }));

    const payments = [];
    for (const playerId of payload.playersId) {
        if (!playerId) continue;
        for (const shuttle of shuttleData) {
            payments.push(db.runAsync(
                `INSERT INTO shuttle_payments (match_id, shuttle_id, player_id, amount_paid) VALUES (?, ?, ?, ?)`,
                [matchId, shuttle.shuttleId, playerId, shuttle.pricePerUnit * shuttle.quantityUsed]
            ));
        }
    }
    await Promise.all(payments);

    await Promise.all(shuttleData.map(s =>
        db.runAsync(
            `INSERT INTO match_shuttles (match_id, shuttle_id, quantity_used) VALUES (?, ?, ?)`,
            [matchId, s.shuttleId, s.quantityUsed]
        )
    ));

    await db.execAsync("COMMIT");

    return { matchId };
}

export type MatchFull = {
    session_id: number,
    match_id: number,
    date: string
    players: 
        Record<number, {
        players_id: number,
        name: string,
        position: number,
    }>,
    shuttles: {
        shuttle_id: number,
        name: string,
        quantity_used: number,
    }[]
}

export async function fetchMatchById(id: string): Promise<MatchFull> {

    const matchRows: any = await db.getAllAsync(`
        SELECT
        m.session_id,
        m.match_id,
        m.date,
        ms.shuttle_id,
        mp.player_id,
        mp.position,
        p.name AS player_name,
        ms.quantity_used,
        s.name AS shuttle_name
        FROM matches m
        LEFT JOIN match_shuttles ms ON ms.match_id = m.match_id
        LEFT JOIN match_players mp ON mp.match_id = m.match_id
        LEFT JOIN shuttles s ON s.shuttle_id = ms.shuttle_id
        LEFT JOIN players p ON p.player_id = mp.player_id
        WHERE m.match_id = ?
        `, [id])

    const playersMap: Record<number, any> = {}
    const shuttlesMap: Record<number, any> = {}

    for (let row of matchRows) {
        if (!playersMap[row.position]) {
            playersMap[row.position] = {
                player_id: row.player_id,
                name: row.player_name,
                position: row.position
            }
        }

        if (!shuttlesMap[row.shuttle_id]) {
            shuttlesMap[row.shuttle_id] = {
                shuttle_id: row.shuttle_id,
                name: row.shuttle_name,
                quantity_used: row.quantity_used
            }
        }
    }

    return {
        session_id: matchRows[0].session_id,
        match_id: matchRows[0].match_id,
        date: matchRows[0].date,
        players: playersMap,
        shuttles: Object.values(shuttlesMap)
    }
}




export async function fetchAllMatches(): Promise<Match[]> {
    const res: Match[] = await db.getAllAsync(`SELECT * FROM matches`)
    return res
}

export async function fetchMatchesBySessionId(sessionId: string): Promise<Match[]> {
    const res: Match[] = await db.getAllAsync(`SELECT * FROM matches WHERE session_id = ${sessionId}`)
    return res
}