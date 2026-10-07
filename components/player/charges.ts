import { LedgerSession } from "@/services/player"
import { ChargeKey } from "@/services/shuttle-payments"

export type PickableCharge = {
    key: ChargeKey,
    amount: number,
    matchNumber: number | null
}

export function owedCharges(session: LedgerSession): PickableCharge[] {
    if (session.state !== "owing") return []
    const charges: PickableCharge[] = []
    if (session.court && session.court.owed > 0) {
        charges.push({ key: session.court.key, amount: session.court.owed, matchNumber: null })
    }
    for (const match of session.matches) {
        for (const charge of match.charges) {
            if (charge.owed > 0) {
                charges.push({ key: charge.key, amount: charge.owed, matchNumber: match.match_number })
            }
        }
    }
    return charges
}

export function sumAmounts(charges: { amount: number }[]): number {
    return Math.round(charges.reduce((sum, charge) => sum + charge.amount, 0) * 100) / 100
}
