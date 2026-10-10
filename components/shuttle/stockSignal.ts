const listeners = new Set<() => void>()

export function subscribeShuttleStock(listener: () => void) {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export function notifyShuttleStockChanged() {
    listeners.forEach((listener) => listener())
}
