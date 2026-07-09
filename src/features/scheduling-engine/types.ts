// Internal engine types. The engine is PURE TypeScript: no React, no Electron,
// no store imports. Inputs in, outputs out — fully deterministic.
import type { ScheduleEvent } from '@/types'

/** One active day of the training with its allowed time window (minutes from midnight). */
export interface DayWindow {
  date: string // "yyyy-MM-dd"
  dayOfWeek: number // 0 = Sunday
  startMinutes: number
  endMinutes: number
}

/** Mutable occupancy grid for one day during placement. */
export interface DayGrid {
  window: DayWindow
  /** Sorted list of occupied ranges in minutes. */
  occupied: { start: number; end: number; eventId: string }[]
  fullDayLocked: boolean
}

export interface PlacementContext {
  grids: Map<string, DayGrid> // by date
  events: ScheduleEvent[]
  nextId: () => string
  timestamp: string
}

export interface FlexibleInstance {
  title: string
  durationMinutes: number
  type: ScheduleEvent['type']
  flexibilityLevel: ScheduleEvent['flexibilityLevel']
  preferredDayIndexes?: number[]
  preferredStartTime?: string
  sourceImportItemId?: string
  visibleToSoldiers: boolean
  sameDateOnly?: string // semi-flexible events restricted to their original day
  originalEvent?: ScheduleEvent
}
