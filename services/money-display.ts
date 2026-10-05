export function formatRM(amount: number): string {
    const cents = Math.round(Math.abs(amount) * 100)
    const value = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
    return `RM ${value}`
}
