import { format } from 'date-fns'

export function DisplayTimeDDDASHMMDASHYYYY(date: string | Date) {
    if (!date) return
    let ts
    if (typeof date == 'string') {
        ts = new Date(date)
    } else {
        ts = date
    }
    
    return format(date, "dd/MM/yyyy")
}