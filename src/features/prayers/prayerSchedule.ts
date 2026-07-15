import { dayOfWeek } from '@/lib/time'
import { isElul, isIsraeliSummerClock, isRoshChodesh } from '@/lib/hebcalendar'
import { prayersCopy } from '@/lib/hebrewCopy'

// Fixed base prayer times for בה"ד, derived per date from the Hebrew calendar
// (Thursday / Rosh Chodesh variations, Elul Selichot) and the Israeli
// summer/winter clock. Saturday has no fixed times in this schedule.

export type PrayerKey = 'selichot-morning' | 'shacharit' | 'selichot-noon' | 'mincha' | 'arvit'

export interface PrayerSlot {
  key: PrayerKey
  name: string
  start: string
  end: string
  color: string
}

const COLOR = {
  selichot: '#06d6a0', // mint — pre-dawn
  shacharit: '#3a86ff', // blue — morning
  mincha: '#fb5607', // orange — afternoon
  arvit: '#8338ec' // purple — night
} as const

/** Ordered prayer slots for a single "yyyy-MM-dd" (empty on Saturday). */
export function prayersForDate(dateISO: string): PrayerSlot[] {
  const dow = dayOfWeek(dateISO)
  if (dow === 6) return [] // Saturday

  const summer = isIsraeliSummerClock(dateISO)
  const rc = isRoshChodesh(dateISO)
  const elul = isElul(dateISO)
  const isThu = dow === 4

  const slots: PrayerSlot[] = []

  if (elul) {
    slots.push({
      key: 'selichot-morning',
      name: prayersCopy.selichot,
      start: '05:50',
      end: '06:10',
      color: COLOR.selichot
    })
  }

  // Shacharit: Thursday starts 06:15, other days 06:30. Rosh Chodesh runs a full
  // hour (…07:15 / …07:30); otherwise it ends 07:10.
  const shStart = isThu ? '06:15' : '06:30'
  const shEnd = rc ? (isThu ? '07:15' : '07:30') : '07:10'
  slots.push({
    key: 'shacharit',
    name: rc ? prayersCopy.shacharitMusaf : prayersCopy.shacharit,
    start: shStart,
    end: shEnd,
    color: COLOR.shacharit
  })

  if (elul) {
    slots.push({
      key: 'selichot-noon',
      name: prayersCopy.selichot,
      start: '12:40',
      end: '12:55',
      color: COLOR.selichot
    })
  }

  slots.push({
    key: 'mincha',
    name: prayersCopy.mincha,
    start: summer ? '13:15' : '12:45',
    end: summer ? '13:40' : '13:10',
    color: COLOR.mincha
  })
  slots.push({
    key: 'arvit',
    name: prayersCopy.arvit,
    start: summer ? '21:45' : '19:00',
    end: summer ? '22:05' : '19:20',
    color: COLOR.arvit
  })

  return slots
}

export interface WeekPrayerContext {
  summer: boolean
  hasRoshChodesh: boolean
  isElul: boolean
}

/** Week-level context for the header (clock + which notes apply). */
export function weekPrayerContext(weekDates: string[]): WeekPrayerContext {
  return {
    summer: isIsraeliSummerClock(weekDates[Math.min(3, weekDates.length - 1)] ?? weekDates[0]),
    hasRoshChodesh: weekDates.some(isRoshChodesh),
    isElul: weekDates.some(isElul)
  }
}
