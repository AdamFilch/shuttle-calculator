import { DisplayDateDMonYYYY } from "@/services/time-display"
import { format, isToday } from "date-fns"

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
    return `${count} ${count === 1 ? singular : pluralForm}`
}

export function storedDateLabel(stored: string | null): string | undefined {
    if (!stored) return
    const [year, month, day] = stored.slice(0, 10).split("-").map(Number)
    if (!year || !month || !day) return
    return DisplayDateDMonYYYY(new Date(year, month - 1, day))
}

export function shortDateLabel(date: string): string {
    return format(new Date(date), "d MMM")
}

export function isSessionToday(date: string): boolean {
    return isToday(new Date(date))
}
