import type { Training, TrainingSettings } from '@/types'
import { addDaysISO, dayOfWeek, daysBetween, toMinutes } from '@/lib/time'
import type { DayWindow } from './types'

/** Allowed scheduling windows for every active day in the training range. */
export function getDayWindows(training: Training, settings: TrainingSettings): DayWindow[] {
  const windows: DayWindow[] = []
  const total = daysBetween(training.startDate, training.endDate)
  for (let i = 0; i <= total; i++) {
    const date = addDaysISO(training.startDate, i)
    const dow = dayOfWeek(date)
    if (dow === 5) {
      if (!settings.fridayEnabled) continue
      windows.push({
        date,
        dayOfWeek: dow,
        startMinutes: toMinutes(settings.fridayStart),
        endMinutes: toMinutes(settings.fridayEnd)
      })
    } else if (dow === 6) {
      if (!settings.saturdayEnabled) continue
      windows.push({
        date,
        dayOfWeek: dow,
        startMinutes: toMinutes(settings.saturdayStart),
        endMinutes: toMinutes(settings.saturdayEnd)
      })
    } else {
      windows.push({
        date,
        dayOfWeek: dow,
        startMinutes: toMinutes(settings.defaultDayStart),
        endMinutes: toMinutes(settings.defaultDayEnd)
      })
    }
  }
  return windows
}

export function isLunchStartAllowed(startMinutes: number, settings: TrainingSettings): boolean {
  return (
    startMinutes >= toMinutes(settings.lunchWindow.earliestStart) &&
    startMinutes <= toMinutes(settings.lunchWindow.latestStart)
  )
}

export function isDinnerAllowed(startMinutes: number, settings: TrainingSettings): boolean {
  const endMinutes = startMinutes + settings.dinnerWindow.durationMinutes
  return (
    startMinutes >= toMinutes(settings.dinnerWindow.earliestStart) &&
    startMinutes <= toMinutes(settings.dinnerWindow.latestStart) &&
    endMinutes <= toMinutes(settings.dinnerWindow.latestEnd)
  )
}

/** Default reserve for unknown future guest lectures when no import data exists (see ASSUMPTIONS.md #11). */
export const DEFAULT_GUEST_LECTURE_RESERVE_MINUTES = 180
export const RESERVE_BLOCK_MINUTES = 90
export const MIN_RESERVE_BLOCK_MINUTES = 45
