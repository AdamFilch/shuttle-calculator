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

export async function fetchAllMatches(): Promise<Match[]> {
    const res: Match[] = await db.getAllAsync(`SELECT * FROM matches`)
    return res
}

export async function fetchMatchesBySessionId(sessionId: string): Promise<Match[]> {
    const res: Match[] = await db.getAllAsync(`SELECT * FROM matches WHERE session_id = ${sessionId}`)
    return res
}