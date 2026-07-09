import type {
  ImpossibleScheduleItem,
  Schedule,
  ScheduleConflict,
  ScheduleEvent,
  ScheduleGenerationInput,
  ScheduleGenerationOutput,
  ScheduleWarning
} from '@/types'
import { makeIdFactory } from '@/lib/ids'
import { toHHMM, toMinutes } from '@/lib/time'
import {
  DEFAULT_GUEST_LECTURE_RESERVE_MINUTES,
  MIN_RESERVE_BLOCK_MINUTES,
  RESERVE_BLOCK_MINUTES,
  getDayWindows
} from './constraints'
import { detectConflicts } from './conflictDetector'
import { buildImpactReport } from './impactReport'
import { buildSuggestions } from './suggestions'
import type { DayGrid, FlexibleInstance } from './types'

const SLOT = 15

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

function occupy(grid: DayGrid, start: number, end: number, eventId: string): void {
  grid.occupied.push({ start, end, eventId })
  grid.occupied.sort((a, b) => a.start - b.start)
}

function isFree(grid: DayGrid, start: number, end: number): boolean {
  if (grid.fullDayLocked) return false
  if (start < grid.window.startMinutes || end > grid.window.endMinutes) return false
  return grid.occupied.every((r) => end <= r.start || start >= r.end)
}

/** Earliest fitting start within [earliest, latest] (defaults to the whole window). */
function findFirstFit(
  grid: DayGrid,
  durationMinutes: number,
  earliest?: number,
  latest?: number
): number | null {
  const from = Math.max(grid.window.startMinutes, earliest ?? grid.window.startMinutes)
  const to = Math.min(
    latest ?? grid.window.endMinutes - durationMinutes,
    grid.window.endMinutes - durationMinutes
  )
  for (let start = from; start <= to; start += SLOT) {
    if (isFree(grid, start, start + durationMinutes)) return start
  }
  return null
}

function loadRatio(grid: DayGrid): number {
  const total = grid.window.endMinutes - grid.window.startMinutes
  if (total <= 0 || grid.fullDayLocked) return 1
  const used = grid.occupied.reduce((sum, r) => sum + (r.end - r.start), 0)
  return used / total
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Pure schedule generation. Deterministic: identical input produces identical
 * output (ids come from a local counter, timestamps from the training record).
 *
 * Placement priority: shared -> peak days -> known guest lectures -> other
 * hard events -> guest-lecture reserve -> meals -> imported flexible content
 * -> manual flexible content.
 */
export function generateSchedule(input: ScheduleGenerationInput): ScheduleGenerationOutput {
  const nextId = makeIdFactory('gen')
  const timestamp = input.training.updatedAt
  const warnings: ScheduleWarning[] = []
  const extraConflicts: ScheduleConflict[] = []
  const impossibleItems: ImpossibleScheduleItem[] = []
  const nextConflictId = makeIdFactory('genconflict')
  const nextWarningId = makeIdFactory('genwarn')

  // 1. Validate.
  if (input.training.endDate < input.training.startDate) {
    warnings.push({
      id: nextWarningId(),
      title: 'טווח תאריכים שגוי',
      description: 'תאריך הסיום מוקדם מתאריך ההתחלה.',
      eventIds: []
    })
  }

  // 2. Time grid (15-minute slots per active day).
  const windows = getDayWindows(input.training, input.settings)
  const grids = new Map<string, DayGrid>(
    windows.map((w) => [w.date, { window: w, occupied: [], fullDayLocked: false }])
  )
  const placed: ScheduleEvent[] = []

  const placeHard = (event: ScheduleEvent, fullDay = false): void => {
    const grid = grids.get(event.date)
    const stored = { ...event }
    if (grid) {
      if (fullDay || event.isFullDay) {
        grid.fullDayLocked = true
        stored.startTime = toHHMM(grid.window.startMinutes)
        stored.endTime = toHHMM(grid.window.endMinutes)
        stored.durationMinutes = grid.window.endMinutes - grid.window.startMinutes
        occupy(grid, grid.window.startMinutes, grid.window.endMinutes, stored.id)
      } else {
        occupy(grid, toMinutes(event.startTime), toMinutes(event.endTime), event.id)
      }
    } else {
      warnings.push({
        id: nextWarningId(),
        title: 'רכיב קשיח מחוץ לטווח ההכשרה',
        description: `"${event.title}" (${event.date}) מחוץ לימי הפעילות של ההכשרה.`,
        eventIds: [event.id]
      })
    }
    placed.push(stored)
  }

  // 3-4. Hard events by hardness priority.
  input.sharedEvents.forEach((e) => placeHard(e))
  input.peakDays.forEach((e) => placeHard(e, true))
  input.knownGuestLectures.forEach((e) => placeHard(e))
  input.hardEvents
    .filter(
      (e) =>
        !input.sharedEvents.includes(e) &&
        !input.peakDays.includes(e) &&
        !input.knownGuestLectures.includes(e)
    )
    .forEach((e) => placeHard(e))

  // 5. Reserve time for unknown future guest lectures near the end.
  const knownGuestMinutes = input.knownGuestLectures.reduce((s, e) => s + e.durationMinutes, 0)
  const targetReserve = input.importedTrainingTemplate
    ? input.importedTrainingTemplate.averageGuestLectureMinutesPerTraining
    : DEFAULT_GUEST_LECTURE_RESERVE_MINUTES
  let reserveLeft = Math.max(0, targetReserve - knownGuestMinutes)
  let placedReserve = false
  if (reserveLeft >= MIN_RESERVE_BLOCK_MINUTES) {
    const lastThird = windows.slice(Math.floor((windows.length * 2) / 3)).reverse()
    for (const w of lastThird) {
      if (reserveLeft < MIN_RESERVE_BLOCK_MINUTES) break
      const grid = grids.get(w.date)
      if (!grid || grid.fullDayLocked) continue
      const block = Math.min(RESERVE_BLOCK_MINUTES, reserveLeft)
      const start = findFirstFit(grid, block, toMinutes('13:00')) ?? findFirstFit(grid, block)
      if (start == null) continue
      const event: ScheduleEvent = {
        id: nextId(),
        trainingId: input.training.id,
        title: 'זמן שמור להרצאות חוץ',
        type: 'CUSTOM',
        flexibilityLevel: 'SEMI_FLEXIBLE',
        date: w.date,
        startTime: toHHMM(start),
        endTime: toHHMM(start + block),
        durationMinutes: block,
        isLocked: false,
        visibleToSoldiers: false,
        createdBy: 'engine',
        createdAt: timestamp,
        updatedAt: timestamp
      }
      occupy(grid, start, start + block, event.id)
      placed.push(event)
      reserveLeft -= block
      placedReserve = true
    }
  }

  // 6. Meals: lunch + dinner as single 60-minute blocks inside allowed windows.
  for (const w of windows) {
    const grid = grids.get(w.date)
    if (!grid || grid.fullDayLocked) continue

    const lunch = input.settings.lunchWindow
    if (w.endMinutes > toMinutes(lunch.earliestStart) + lunch.durationMinutes) {
      const start = findFirstFit(
        grid,
        lunch.durationMinutes,
        toMinutes(lunch.earliestStart),
        toMinutes(lunch.latestStart)
      )
      if (start != null) {
        const event = mealEvent(nextId(), input.training.id, w.date, start, lunch.durationMinutes, 'ארוחת צהריים והפסקה', timestamp)
        occupy(grid, start, start + lunch.durationMinutes, event.id)
        placed.push(event)
      } else {
        warnings.push({
          id: nextWarningId(),
          title: 'לא נמצא חלון לארוחת צהריים',
          description: `בתאריך ${w.date} לא נמצא חלון פנוי לארוחת צהריים בין ${lunch.earliestStart} ל-${lunch.latestStart}.`,
          eventIds: []
        })
      }
    }

    const dinner = input.settings.dinnerWindow
    if (w.endMinutes >= toMinutes(dinner.earliestStart) + dinner.durationMinutes) {
      const latestByEnd = toMinutes(dinner.latestEnd) - dinner.durationMinutes
      const start = findFirstFit(
        grid,
        dinner.durationMinutes,
        toMinutes(dinner.earliestStart),
        Math.min(toMinutes(dinner.latestStart), latestByEnd)
      )
      if (start != null) {
        const event = mealEvent(nextId(), input.training.id, w.date, start, dinner.durationMinutes, 'ארוחת ערב והפסקה', timestamp)
        occupy(grid, start, start + dinner.durationMinutes, event.id)
        placed.push(event)
      } else {
        warnings.push({
          id: nextWarningId(),
          title: 'לא נמצא חלון לארוחת ערב',
          description: `בתאריך ${w.date} לא נמצא חלון פנוי לארוחת ערב בין ${dinner.earliestStart} ל-${dinner.latestStart}.`,
          eventIds: []
        })
      }
    }
  }

  // 7. Flexible content: imported first (preserving learned rhythm), then manual.
  const instances: FlexibleInstance[] = []

  if (input.importedTrainingTemplate) {
    const sourceCount = Math.max(1, input.importedTrainingTemplate.sourceFileNames.length)
    for (const item of input.importedTrainingTemplate.items) {
      if (!item.included || item.markedAsOneOff || item.markedAsGuestLectureReserve) continue
      if (item.suggestedEventType === 'MEAL_BREAK') continue // meals are engine-placed
      const perTraining = Math.max(1, Math.round(item.occurrences / sourceCount))
      const count = Math.min(perTraining, windows.length)
      const duration = Math.max(SLOT, Math.round(item.averageDurationMinutes / SLOT) * SLOT)
      for (let i = 0; i < count; i++) {
        instances.push({
          title: item.title,
          durationMinutes: duration,
          type: item.suggestedEventType,
          flexibilityLevel: item.suggestedFlexibilityLevel === 'SEMI_FLEXIBLE' ? 'SEMI_FLEXIBLE' : 'FLEXIBLE',
          preferredDayIndexes: item.typicalDayIndexes,
          preferredStartTime: item.typicalStartTime,
          sourceImportItemId: item.id,
          visibleToSoldiers: true
        })
      }
    }
  }

  for (const e of input.manualFlexibleEvents) {
    instances.push({
      title: e.title,
      durationMinutes: e.durationMinutes,
      type: e.type,
      flexibilityLevel: e.flexibilityLevel,
      preferredStartTime: e.startTime,
      sameDateOnly: e.flexibilityLevel === 'SEMI_FLEXIBLE' ? e.date : undefined,
      preferredDayIndexes: undefined,
      visibleToSoldiers: e.visibleToSoldiers,
      originalEvent: e
    })
  }

  // Constrained (semi-flexible) first, then longer blocks first — stable order.
  instances.sort((a, b) => {
    const aConstrained = a.sameDateOnly ? 0 : 1
    const bConstrained = b.sameDateOnly ? 0 : 1
    if (aConstrained !== bConstrained) return aConstrained - bConstrained
    if (b.durationMinutes !== a.durationMinutes) return b.durationMinutes - a.durationMinutes
    return a.title.localeCompare(b.title)
  })

  for (const inst of instances) {
    const candidates = [...windows]
      .filter((w) => !inst.sameDateOnly || w.date === inst.sameDateOnly)
      .map((w) => grids.get(w.date)!)
      .filter((g) => !g.fullDayLocked)
      .sort((a, b) => {
        const load = loadRatio(a) - loadRatio(b)
        if (Math.abs(load) > 0.001) return load
        const aPref = inst.preferredDayIndexes?.includes(a.window.dayOfWeek) ? 0 : 1
        const bPref = inst.preferredDayIndexes?.includes(b.window.dayOfWeek) ? 0 : 1
        if (aPref !== bPref) return aPref - bPref
        return a.window.date.localeCompare(b.window.date)
      })

    let placedInstance = false
    for (const grid of candidates) {
      let start: number | null = null
      if (inst.preferredStartTime) {
        const pref = toMinutes(inst.preferredStartTime)
        if (isFree(grid, pref, pref + inst.durationMinutes)) start = pref
      }
      if (start == null) start = findFirstFit(grid, inst.durationMinutes)
      if (start == null) continue

      const base = inst.originalEvent
      const event: ScheduleEvent = {
        ...(base ?? {}),
        id: base?.id ?? nextId(),
        trainingId: input.training.id,
        title: inst.title,
        type: inst.type,
        flexibilityLevel: inst.flexibilityLevel,
        date: grid.window.date,
        startTime: toHHMM(start),
        endTime: toHHMM(start + inst.durationMinutes),
        durationMinutes: inst.durationMinutes,
        isLocked: false,
        visibleToSoldiers: inst.visibleToSoldiers,
        createdBy: base?.createdBy ?? 'engine',
        createdAt: base?.createdAt ?? timestamp,
        updatedAt: timestamp
      }
      occupy(grid, start, start + inst.durationMinutes, event.id)
      placed.push(event)
      placedInstance = true
      break
    }

    if (!placedInstance) {
      impossibleItems.push({
        id: nextId(),
        title: inst.title,
        durationMinutes: inst.durationMinutes,
        reason: 'לא נמצא חלון פנוי בטווח ההכשרה.',
        sourceImportItemId: inst.sourceImportItemId,
        sourceEventId: inst.originalEvent?.id
      })
    }
  }

  // 8. Never drop content silently.
  if (impossibleItems.length > 0) {
    extraConflicts.push({
      id: nextConflictId(),
      severity: 'BLOCKING',
      title: 'לא נמצא מספיק זמן לשיבוץ כל הרכיבים.',
      description: `${impossibleItems.length} רכיבים לא שובצו: ${impossibleItems
        .map((i) => `"${i.title}"`)
        .join(', ')}.`,
      eventIds: [],
      trainingIds: [input.training.id],
      suggestedResolutionIds: [],
      canOverride: true
    })
  }

  // 9. Assemble the draft schedule.
  placed.sort((a, b) =>
    a.date === b.date ? toMinutes(a.startTime) - toMinutes(b.startTime) : a.date.localeCompare(b.date)
  )
  const scheduleId = nextId()
  const schedule: Schedule = {
    id: scheduleId,
    trainingId: input.training.id,
    versionNumber: 1,
    status: 'DRAFT',
    events: placed.map((e) => ({ ...e, scheduleId })),
    generatedFromImportIds: input.importedTrainingTemplate
      ? [input.importedTrainingTemplate.id]
      : [],
    createdAt: timestamp,
    updatedAt: timestamp
  }

  // 10-12. Conflicts, impact, suggestions.
  const conflicts = [
    ...detectConflicts({
      events: schedule.events,
      training: input.training,
      settings: input.settings
    }),
    ...extraConflicts
  ]

  const impactReport = buildImpactReport({
    summary:
      input.existingDraftEvents.length > 0
        ? 'הפקת לו״ז מחדש על בסיס הרכיבים הקשיחים והתכנים שנלמדו.'
        : 'הפקת לו״ז ראשונית.',
    trainingId: input.training.id,
    before: input.existingDraftEvents,
    after: schedule.events,
    conflictsCreated: conflicts.filter((c) => c.severity === 'BLOCKING')
  })

  const suggestions = buildSuggestions({
    conflicts,
    impossibleItems,
    events: schedule.events,
    hasGuestReserve: placedReserve
  })

  return { schedule, conflicts, warnings, impactReport, suggestions, impossibleItems }
}

function mealEvent(
  id: string,
  trainingId: string,
  date: string,
  startMinutes: number,
  durationMinutes: number,
  title: string,
  timestamp: string
): ScheduleEvent {
  return {
    id,
    trainingId,
    title,
    type: 'MEAL_BREAK',
    flexibilityLevel: 'SEMI_FLEXIBLE',
    date,
    startTime: toHHMM(startMinutes),
    endTime: toHHMM(startMinutes + durationMinutes),
    durationMinutes,
    isLocked: false,
    visibleToSoldiers: true,
    createdBy: 'engine',
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
