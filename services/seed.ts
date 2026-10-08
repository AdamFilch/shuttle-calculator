import { subDays } from "date-fns";
import { bookCourt } from "./court";
import { createNewMatch } from "./match";
import { createPlayer, deletePlayer, fetchAllPlayers } from "./player";
import { closeSession, createNewSession, fetchAllSessions } from "./session";
import { addShuttlePurchase, createShuttle, fetchAllShuttles, updateShuttle } from "./shuttle";
import { paySessionInFull } from "./shuttle-payments";
import { fetchShuttleInstancesBySessionId } from "./shuttle_instances";

async function seedDefault() {
    const names = ['Alice', 'Ben', 'Chloe', 'Daniel', 'Elena', 'Farid']
    const ids: number[] = []
    for (const name of names) ids.push(await createPlayer(name))
    const [alice, ben, chloe, daniel, elena, farid] = ids

    const retired = await createPlayer('Gina')
    await deletePlayer(retired)

    const bought = subDays(new Date(), 14).toISOString()
    const yonex = await createShuttle({ name: 'Yonex AS-30', tube_price: 120, per_tube: 12, tubes: 1, date: bought })
    await addShuttlePurchase({ shuttle_id: yonex, num_of_shuttles: 12, date: subDays(new Date(), 10).toISOString() })
    const victor = await createShuttle({ name: 'Victor Master No.3', tube_price: 72, per_tube: 12, tubes: 1, date: bought })
    await updateShuttle({ shuttle_id: victor, name: 'Victor Master No.3', price_per_shuttle: 6, warn_at: 12, warn_unit: 'shuttles' })
    const rsl = await createShuttle({ name: 'RSL Classic', tube_price: 54, per_tube: 6, tubes: 1, date: bought })

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
        shuttleSelections: [
            { mode: 'new', shuttleId: yonex, quantity: 1 },
            { mode: 'new', shuttleId: rsl, quantity: 3 }
        ]
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
    await createNewMatch({
        sessionId: today,
        playersId: [alice, elena],
        shuttleSelections: [
            { mode: 'new', shuttleId: yonex, quantity: 1 },
            { mode: 'new', shuttleId: rsl, quantity: 3 }
        ]
    })
    await createNewMatch({
        sessionId: today,
        playersId: [ben, daniel, chloe],
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

async function seedEmptySession() {
    await seedDefault()
    const empty = await createNewSession({
        name: 'Saturday Social',
        date: new Date().toISOString(),
        startTime: '10:00',
        location: 'Community Centre'
    })
    await bookCourt({ sessionId: empty, label: 'Court 4', price: 25, quantity: 2, durationMinutes: 120 })
    await bookCourt({ sessionId: empty, label: 'Court 5', price: 20, quantity: 1 })
}

async function seedStaleOpen() {
    await seedDefault()
    const players = await fetchAllPlayers()
    const [yonex] = await fetchAllShuttles()
    const stale = await createNewSession({
        name: 'Friday Doubles',
        date: subDays(new Date(), 3).toISOString(),
        startTime: '19:30',
        location: 'Community Centre'
    })
    await createNewMatch({
        sessionId: stale,
        playersId: players.slice(0, 4).map((p) => p.player_id),
        shuttleSelections: [{ mode: 'new', shuttleId: yonex.shuttle_id, quantity: 1 }]
    })
}

async function seedShuttlePicker() {
    const ids: number[] = []
    for (const name of ['Alice', 'Ben', 'Chloe', 'Daniel']) ids.push(await createPlayer(name))
    const [alice, ben, chloe, daniel] = ids

    const yonex = await createShuttle({ name: 'Yonex AS-50', tube_price: 150, per_tube: 12, tubes: 1 })
    const rsl = await createShuttle({ name: 'RSL Classic', tube_price: 60, per_tube: 6, tubes: 1 })
    const liNing = await createShuttle({ name: 'Li-Ning A+60', tube_price: 96, per_tube: 12, tubes: 1 })
    const victor = await createShuttle({ name: 'Victor Gold', tube_price: 48, per_tube: 4, tubes: 1 })
    await createShuttle({ name: 'Apacs Feather', tube_price: 84, per_tube: 12, tubes: 1 })
    await createShuttle({ name: 'Kawasaki King', tube_price: 90, per_tube: 12, tubes: 1 })

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

async function seedShuttles() {
    const ids: number[] = []
    for (const name of ['Alice', 'Ben', 'Chloe', 'Daniel']) ids.push(await createPlayer(name))
    const [alice, ben, chloe, daniel] = ids
    const daysAgo = (days: number) => subDays(new Date(), days).toISOString()

    const yonex = await createShuttle({ name: 'Yonex AS-50', tube_price: 150, per_tube: 12, tubes: 4, date: daysAgo(70) })
    await addShuttlePurchase({ shuttle_id: yonex, num_of_shuttles: 24, date: daysAgo(30) })
    const rsl = await createShuttle({ name: 'RSL Classic', tube_price: 66, per_tube: 12, tubes: 1, date: daysAgo(70) })
    await addShuttlePurchase({ shuttle_id: rsl, num_of_shuttles: 6, date: daysAgo(24) })
    await updateShuttle({ shuttle_id: rsl, name: 'RSL Classic', price_per_shuttle: 5.5, warn_at: 3, warn_unit: 'sessions' })
    const aeroplane = await createShuttle({ name: 'Aeroplane Gold', tube_price: 54, per_tube: 12, tubes: 1 })
    await updateShuttle({ shuttle_id: aeroplane, name: 'Aeroplane Gold', price_per_shuttle: 4.5, warn_at: 2, warn_unit: 'sessions' })

    const usage = [[3, 2], [4, 1], [2, 2], [5, 1], [3, 2], [4, 2], [3, 1], [2, 2], [4, 1]]
    for (const [i, [yonexUsed, rslUsed]] of usage.entries()) {
        const session = await createNewSession({
            name: 'Weekly Smash',
            date: daysAgo(7 * (usage.length - i)),
            startTime: '20:00',
            location: 'Sports Hall A'
        })
        await createNewMatch({
            sessionId: session,
            playersId: [alice, ben, chloe, daniel],
            shuttleSelections: [{ mode: 'new', shuttleId: yonex, quantity: yonexUsed }, { mode: 'free' }]
        })
        await createNewMatch({
            sessionId: session,
            playersId: [chloe, alice, daniel, ben],
            shuttleSelections: [{ mode: 'new', shuttleId: rsl, quantity: rslUsed }]
        })
        await closeSession(String(session))
    }

    const freeOnly = await createNewSession({
        name: 'Holiday Social',
        date: daysAgo(25),
        startTime: '10:00',
        location: 'Community Centre'
    })
    await createNewMatch({
        sessionId: freeOnly,
        playersId: [alice, ben, chloe, daniel],
        shuttleSelections: [{ mode: 'free' }]
    })
    await closeSession(String(freeOnly))
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
    shuttles: seedShuttles,
    'closed-today': seedClosedToday,
    'empty-session': seedEmptySession,
    'stale-open': seedStaleOpen,
}

export async function seedDatabase(scenario = 'default') {
    const run = scenarios[scenario]
    if (!run) {
        throw new Error(`Unknown seed scenario "${scenario}". Available: ${Object.keys(scenarios).join(', ')}`)
    }
    await run()
}
