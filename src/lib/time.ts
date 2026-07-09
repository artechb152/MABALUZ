import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'

// All times are "HH:mm" strings on a 15-minute grid; all dates "yyyy-MM-dd".

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function snapToGrid(minutes: number, slot = 15): number {
  return Math.round(minutes / slot) * slot
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function addDaysISO(dateISO: string, days: number): string {
  return format(addDays(parseISO(dateISO), days), 'yyyy-MM-dd')
}

export function weekStartISO(dateISO: string): string {
  return format(startOfWeek(parseISO(dateISO), { weekStartsOn: 0 }), 'yyyy-MM-dd')
}

/** 0 = Sunday ... 6 = Saturday */
export function dayOfWeek(dateISO: string): number {
  return parseISO(dateISO).getDay()
}

export function daysBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseISO(toISO), parseISO(fromISO))
}

export function formatDateHe(dateISO: string): string {
  return format(parseISO(dateISO), 'dd/MM/yyyy')
}

export function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd)
}

export function nowISO(): string {
  return new Date().toISOString()
}
