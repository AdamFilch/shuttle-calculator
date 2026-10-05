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