import type { TrainingSettings } from '@/types'
import { toMinutes } from '@/lib/time'

export const PX_PER_HOUR = 60
export const PX_PER_MIN = PX_PER_HOUR / 60
export const SLOT_MINUTES = 15

export interface DaySpec {
  startMinutes: number
  endMinutes: number
  enabled: boolean
}

/** Allowed window for a day-of-week (0=Sunday) under the training settings. */
export function daySpecFor(dow: number, settings: TrainingSettings): DaySpec {
  if (dow === 5) {
    return {
      enabled: settings.fridayEnabled,
      startMinutes: toMinutes(settings.fridayStart),
      endMinutes: toMinutes(settings.fridayEnd)
    }
  }
  if (dow === 6) {
    return {
      enabled: settings.saturdayEnabled,
      startMinutes: toMinutes(settings.saturdayStart),
      endMinutes: toMinutes(settings.saturdayEnd)
    }
  }
  return {
    enabled: true,
    startMinutes: toMinutes(settings.defaultDayStart),
    endMinutes: toMinutes(settings.defaultDayEnd)
  }
}

/** Vertical extent of the grid: covers every enabled day window. */
export function gridRange(settings: TrainingSettings): { start: number; end: number } {
  const specs = [0, 5, 6].map((d) => daySpecFor(d, settings)).filter((s) => s.enabled)
  const start = Math.min(...specs.map((s) => s.startMinutes))
  const end = Math.max(...specs.map((s) => s.endMinutes))
  return { start, end }
}

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES
}
