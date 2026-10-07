import { format } from 'date-fns'

export function DisplayTimeDDDASHMMDASHYYYY(date: string | Date) {
    if (!date) return
    let ts
    if (typeof date == 'string') {
        ts = new Date(date)
    } else {
        ts = date
    }
    
    return format(ts, "dd/MM/yyyy")
}


export function DisplayDateDMonYYYY(date: string | Date) {
    if (!date) return
    const ts = typeof date == 'string' ? new Date(date) : date
    return format(ts, "d MMM yyyy")
}


export function convertTimeToSQLTimeStamp(date: string | Date) {
    
    if (!date) return
    let ts 
    if (typeof date == 'string') {
        ts = new Date(date)
    } else {
        ts = date
    }
    return format(ts, "yyyy-MM-dd hh:mm:ss")
}


export function parseSQLTimestamp(timestamp: string): Date {
    return new Date(`${timestamp.replace(' ', 'T')}Z`)
}

export function DisplayTimeOfDay(date: Date) {
    return format(date, "h:mm aaa")
}

export function DisplayStartTime(startTime: string | null | undefined) {
    if (!startTime) return
    const [hours, minutes] = startTime.split(':').map(Number)
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return
    const ts = new Date()
    ts.setHours(hours, minutes, 0, 0)
    return DisplayTimeOfDay(ts)
}