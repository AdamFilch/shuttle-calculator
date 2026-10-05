import { subDays } from "date-fns";
import { bookCourt } from "./court";
import { createNewMatch } from "./match";
import { createPlayer, deletePlayer } from "./player";
import { closeSession, createNewSession } from "./session";
import { addShuttlePurchase, createShuttle } from "./shuttle";
import { paySessionInFull } from "./shuttle-payments";
import { fetchShuttleInstancesBySessionId } from "./shuttle_instances";

async function seedDefault() {
    const names = ['Alice', 'Ben', 'Chloe', 'Daniel', 'Elena', 'Farid']
    const ids: number[] = []
    for (const name of names) ids.push(await createPlayer(name))
    const [alice, ben, chloe, daniel, elena, farid] = ids

    const retired = await createPlayer('Gina')
    await deletePlayer(retired)

    const yonex = await createShuttle({ name: 'Yonex AS-30', total_price: 120, num_of_shuttles: 12 })
    await addShuttlePurchase({ shuttle_id: yonex, num_of_shuttles: 12 })
    const victor = await createShuttle({ name: 'Victor Master No.3', total_price: 72, num_of_shuttles: 12 })

    const lastWeek = await createNewSession({
        name: 'Weekly Smash',
        date: subDays(new Date(), 7).toISOString(),
        startTime: '20:00',
        location: 'Sports Hall A'
    })
    await bookCourt({ sessionId: lastWeek, label: 'Court 3', price: 30, quantity: 2, durationMinutes: 120 })
    await createNewMatch({
        sessionId: lastWeek,
        playersId: [alice, ben, chloe, daniel],
        shuttleSelections: [{ mode: 'new', shuttleId: yonex, quantity: 2 }]
    })
    await createNewMatch({
        sessionId: lastWeek,
        playersId: [elena, farid, alice, ben],
        shuttleSelections: [{ mode: 'new', shuttleId: victor, quantity: 1 }]
    })
    await createNewMatch({
        sessionId: lastWeek,
        playersId: [chloe, daniel, elena, farid],
        shuttleSelections: [{ mode: 'new', shuttleId: yonex, quantity: 1 }]
    })
    await closeSession(String(lastWeek))
    await paySessionInFull({ sessionId: lastWeek, player_id: String(alice) })

    const today = await createNewSession({
        name: 'Friday Doubles',
        date: new Date().toISOString(),
        startTime: '19:30',
        location: 'Community Centre'
    })
    await bookCourt({ sessionId: today, label: 'Court 1', price: 25, quantity: 1, durationMinutes: 90 })
    await createNewMatch({
        sessionId: today,
        playersId: [alice, chloe, ben, elena],
        shuttleSelections: [{ mode: 'new', shuttleId: yonex, quantity: 1 }]
    })
    const [firstInstance] = await fetchShuttleInstancesBySessionId(today)
    await createNewMatch({
        sessionId: today,
        playersId: [daniel, farid, chloe, ben],
        shuttleSelections: [
            { mode: 'reused', shuttleInstanceId: firstInstance.shuttle_instance_id },
            { mode: 'free' }
        ]
    })
}

export const scenarios: Record<string, () => Promise<void>> = {
    default: seedDefault,
    empty: async () => { },
}

export async function seedDatabase(scenario = 'default') {
    const run = scenarios[scenario]
    if (!run) {
        throw new Error(`Unknown seed scenario "${scenario}". Available: ${Object.keys(scenarios).join(', ')}`)
    }
    await run()
}
