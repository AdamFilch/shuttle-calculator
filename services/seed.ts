import { subDays } from "date-fns";
import { bookCourt } from "./court";
import { createNewMatch } from "./match";
import { createPlayer, deletePlayer } from "./player";
import { closeSession, createNewSession, fetchAllSessions } from "./session";
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

async function seedClosedToday() {
    await seedDefault()
    const sessions: { session_id: number }[] = await fetchAllSessions()
    const today = Math.max(...sessions.map((s) => s.session_id))
    await bookCourt({ sessionId: today, label: 'Court 2', price: 20, quantity: 1 })
    await closeSession(String(today))
}

async function seedShuttlePicker() {
    const ids: number[] = []
    for (const name of ['Alice', 'Ben', 'Chloe', 'Daniel']) ids.push(await createPlayer(name))
    const [alice, ben, chloe, daniel] = ids

    const yonex = await createShuttle({ name: 'Yonex AS-50', total_price: 150, num_of_shuttles: 12 })
    const rsl = await createShuttle({ name: 'RSL Classic', total_price: 60, num_of_shuttles: 6 })
    const liNing = await createShuttle({ name: 'Li-Ning A+60', total_price: 96, num_of_shuttles: 12 })
    const victor = await createShuttle({ name: 'Victor Gold', total_price: 48, num_of_shuttles: 4 })
    await createShuttle({ name: 'Apacs Feather', total_price: 84, num_of_shuttles: 12 })
    await createShuttle({ name: 'Kawasaki King', total_price: 90, num_of_shuttles: 12 })

    const lastWeek = await createNewSession({
        name: 'Weekly Smash',
        date: subDays(new Date(), 7).toISOString(),
        startTime: '20:00',
        location: 'Sports Hall A'
    })
    await createNewMatch({
        sessionId: lastWeek,
        playersId: [alice, ben, chloe, daniel],
        shuttleSelections: [{ mode: 'new', shuttleId: yonex, quantity: 5 }]
    })
    await createNewMatch({
        sessionId: lastWeek,
        playersId: [chloe, daniel, alice, ben],
        shuttleSelections: [{ mode: 'new', shuttleId: rsl, quantity: 3 }]
    })
    await createNewMatch({
        sessionId: lastWeek,
        playersId: [alice, chloe, ben, daniel],
        shuttleSelections: [{ mode: 'new', shuttleId: liNing, quantity: 2 }]
    })
    await closeSession(String(lastWeek))

    const today = await createNewSession({
        name: 'Friday Doubles',
        date: new Date().toISOString(),
        startTime: '19:30',
        location: 'Community Centre'
    })
    await createNewMatch({
        sessionId: today,
        playersId: [alice, ben, chloe, daniel],
        shuttleSelections: [{ mode: 'new', shuttleId: victor, quantity: 4 }]
    })

    await createNewSession({
        name: 'Sunday Social',
        date: subDays(new Date(), 1).toISOString(),
        startTime: '10:00',
        location: 'Community Centre'
    })
}

async function seedNoShuttles() {
    for (const name of ['Alice', 'Ben', 'Chloe', 'Daniel']) await createPlayer(name)
    await createNewSession({
        name: 'Friday Doubles',
        date: new Date().toISOString(),
        startTime: '19:30',
        location: 'Community Centre'
    })
}

export const scenarios: Record<string, () => Promise<void>> = {
    default: seedDefault,
    empty: async () => { },
    'shuttle-picker': seedShuttlePicker,
    'no-shuttles': seedNoShuttles,
    'closed-today': seedClosedToday,
}

export async function seedDatabase(scenario = 'default') {
    const run = scenarios[scenario]
    if (!run) {
        throw new Error(`Unknown seed scenario "${scenario}". Available: ${Object.keys(scenarios).join(', ')}`)
    }
    await run()
}
