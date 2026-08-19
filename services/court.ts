import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync('db.db')

export type CourtBooking = {
    court_booking_id: number,
    session_id: number,
    label: string | null,
    price: number,
    quantity: number,
    date: string
}

export async function bookCourt({
    sessionId,
    label,
    price,
    quantity
}: {
    sessionId: number,
    label?: string,
    price: number,
    quantity: number
}) {
    const res = await db.runAsync(
        `INSERT INTO court_bookings (session_id, label, price, quantity) VALUES (?, ?, ?, ?)`,
        [sessionId, label ?? null, price, quantity]
    );

    return res.lastInsertRowId
}

export async function fetchCourtBookingsBySessionId(sessionId: string): Promise<CourtBooking[]> {
    const res: CourtBooking[] = await db.getAllAsync(
        `SELECT * FROM court_bookings WHERE session_id = ?`,
        [sessionId]
    )
    return res
}
