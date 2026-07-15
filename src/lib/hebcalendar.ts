import { HDate, HebrewCalendar, flags, months, type Event } from '@hebcal/core'

// Hebrew-calendar support for the whole app (dates, holidays, fasts, Rosh
// Chodesh) plus the Israeli summer/winter clock. Pure offline computation via
// @hebcal/core — no network. All inputs are "yyyy-MM-dd" strings.

const NIKUD = /[֑-ׇ]/g

function stripNikud(s: string): string {
  return s.replace(NIKUD, '')
}

/** Build an HDate from a local calendar date, avoiding UTC drift. */
function hdFromISO(iso: string): HDate {
  const [y, m, d] = iso.split('-').map(Number)
  return new HDate(new Date(y, m - 1, d))
}

/** Hebrew date without the year, e.g. "כ״ט תמוז". */
export function hebrewDateShort(iso: string): string {
  const parts = stripNikud(hdFromISO(iso).renderGematriya(true)).split(' ')
  return parts.slice(0, -1).join(' ')
}

/** Hebrew date with the year, e.g. "כ״ט תמוז תשפ״ו". */
export function hebrewDateFull(iso: string): string {
  return stripNikud(hdFromISO(iso).renderGematriya(true))
}

export type HebDayKind = 'holiday' | 'cholhamoed' | 'fast' | 'roshchodesh' | 'modern'

export interface HebDayInfo {
  label: string
  kind: HebDayKind
}

// Minor/technical markers we never surface as a day label.
const IGNORED =
  flags.YOM_KIPPUR_KATAN |
  flags.SHABBAT_MEVARCHIM |
  flags.MOLAD |
  flags.SPECIAL_SHABBAT |
  flags.PARSHA_HASHAVUA |
  flags.DAF_YOMI |
  flags.OMER_COUNT |
  flags.MISHNA_YOMI |
  flags.YERUSHALMI_YOMI |
  flags.NACH_YOMI |
  flags.DAILY_LEARNING |
  flags.HEBREW_DATE

function eventsOn(iso: string): Event[] {
  return HebrewCalendar.getHolidaysOnDate(hdFromISO(iso), true) ?? []
}

/** The single most significant Jewish-calendar label for a date, or null. */
export function hebDayInfo(iso: string): HebDayInfo | null {
  let best: { ev: Event; kind: HebDayKind; prio: number } | null = null
  for (const ev of eventsOn(iso)) {
    const f = ev.getFlags()
    if (f & IGNORED) continue
    let kind: HebDayKind | null = null
    let prio = 0
    if (f & flags.CHAG) {
      kind = 'holiday'
      prio = 5
    } else if (f & flags.MAJOR_FAST) {
      kind = 'fast'
      prio = 4
    } else if (f & flags.CHOL_HAMOED) {
      kind = 'cholhamoed'
      prio = 3
    } else if (f & flags.MINOR_FAST) {
      kind = 'fast'
      prio = 3
    } else if (f & flags.ROSH_CHODESH) {
      kind = 'roshchodesh'
      prio = 2
    } else if (f & flags.MODERN_HOLIDAY) {
      kind = 'modern'
      prio = 1
    }
    if (kind && (!best || prio > best.prio)) best = { ev, kind, prio }
  }
  if (!best) return null
  // Drop a trailing Hebrew year number if the renderer appended one.
  const label = stripNikud(best.ev.render('he')).replace(/\s+\d+$/, '')
  return { label, kind: best.kind }
}

export function isRoshChodesh(iso: string): boolean {
  return eventsOn(iso).some((e) => !!(e.getFlags() & flags.ROSH_CHODESH))
}

/** True during the Hebrew month of Elul (Selichot season). */
export function isElul(iso: string): boolean {
  return hdFromISO(iso).getMonth() === months.ELUL
}

/**
 * Israeli summer clock (DST): from the Friday before the last Sunday of March
 * through the last Sunday of October. Date-level precision is enough here.
 */
export function isIsraeliSummerClock(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const lastSunday = (month0: number) => {
    const last = new Date(y, month0 + 1, 0)
    last.setDate(last.getDate() - last.getDay())
    return last
  }
  const start = lastSunday(2) // last Sunday of March
  start.setDate(start.getDate() - 2) // the Friday before
  const end = lastSunday(9) // last Sunday of October
  return date >= start && date < end
}
