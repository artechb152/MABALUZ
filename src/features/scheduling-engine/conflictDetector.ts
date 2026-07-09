import type {
  GuestLecturer,
  ScheduleConflict,
  ScheduleEvent,
  Training,
  TrainingSettings
} from '@/types'
import { timeRangesOverlap, toMinutes } from '@/lib/time'
import { getDayWindows, isDinnerAllowed, isLunchStartAllowed } from './constraints'
import { makeIdFactory } from '@/lib/ids'

const HARD_LEVELS = new Set(['LOCKED_SHARED', 'LOCKED_PEAK_DAY', 'LOCKED_GUEST_LECTURE'])

export function isHardEvent(e: ScheduleEvent): boolean {
  return HARD_LEVELS.has(e.flexibilityLevel) || e.isLocked
}

export interface DetectConflictsInput {
  events: ScheduleEvent[]
  training: Training
  settings: TrainingSettings
  lecturers?: GuestLecturer[]
  lockedDates?: string[]
}

/** Pure conflict detection over a full event set (usually a draft). */
export function detectConflicts(input: DetectConflictsInput): ScheduleConflict[] {
  const { events, training, settings, lecturers, lockedDates } = input
  const conflicts: ScheduleConflict[] = []
  const nextId = makeIdFactory('conflict')
  const windows = new Map(getDayWindows(training, settings).map((w) => [w.date, w]))

  // 1. Pairwise overlaps within each day.
  const byDate = new Map<string, ScheduleEvent[]>()
  for (const e of events) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }

  for (const [, dayEvents] of byDate) {
    const sorted = [...dayEvents].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]
        const b = sorted[j]
        if (!timeRangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue

        const aHard = isHardEvent(a)
        const bHard = isHardEvent(b)
        const peakVsGuest =
          (a.type === 'PEAK_DAY' && b.type === 'GUEST_LECTURE') ||
          (b.type === 'PEAK_DAY' && a.type === 'GUEST_LECTURE')
        const involvesShared = a.type === 'SHARED' || b.type === 'SHARED'

        if (aHard && bHard) {
          conflicts.push({
            id: nextId(),
            severity: 'BLOCKING',
            title: peakVsGuest
              ? 'יום שיא מתנגש עם הרצאת חוץ'
              : involvesShared
                ? 'רכיב קשיח מתנגש עם לו״ז משותף'
                : 'התנגשות בין שני רכיבים קשיחים',
            description: `"${a.title}" (${a.startTime}-${a.endTime}) מתנגש עם "${b.title}" (${b.startTime}-${b.endTime}) בתאריך ${a.date}.`,
            eventIds: [a.id, b.id],
            trainingIds: [training.id],
            suggestedResolutionIds: [],
            canOverride: peakVsGuest // commander may override after explicit warning
          })
        } else if (aHard || bHard) {
          conflicts.push({
            id: nextId(),
            severity: 'WARNING',
            title: 'רכיב גמיש חופף לרכיב קשיח',
            description: `"${(aHard ? b : a).title}" חופף לרכיב הקשיח "${(aHard ? a : b).title}" בתאריך ${a.date}. יש להזיז את הרכיב הגמיש.`,
            eventIds: [a.id, b.id],
            trainingIds: [training.id],
            suggestedResolutionIds: [],
            canOverride: true
          })
        } else {
          conflicts.push({
            id: nextId(),
            severity: 'WARNING',
            title: 'חפיפה בין רכיבים גמישים',
            description: `"${a.title}" ו"${b.title}" חופפים בתאריך ${a.date}.`,
            eventIds: [a.id, b.id],
            trainingIds: [training.id],
            suggestedResolutionIds: [],
            canOverride: true
          })
        }
      }
    }
  }

  // 2. Events outside the allowed day window / on disabled days.
  for (const e of events) {
    const window = windows.get(e.date)
    if (!window) {
      conflicts.push({
        id: nextId(),
        severity: 'WARNING',
        title: 'רכיב ביום שאינו פעיל',
        description: `"${e.title}" משובץ בתאריך ${e.date} שאינו יום פעילות של ההכשרה.`,
        eventIds: [e.id],
        trainingIds: [training.id],
        suggestedResolutionIds: [],
        canOverride: true
      })
      continue
    }
    if (
      !e.isFullDay &&
      (toMinutes(e.startTime) < window.startMinutes || toMinutes(e.endTime) > window.endMinutes)
    ) {
      conflicts.push({
        id: nextId(),
        severity: 'WARNING',
        title: 'רכיב מחוץ לשעות הפעילות',
        description: `"${e.title}" (${e.startTime}-${e.endTime}) חורג משעות הפעילות של יום ${e.date}.`,
        eventIds: [e.id],
        trainingIds: [training.id],
        suggestedResolutionIds: [],
        canOverride: true
      })
    }
  }

  // 3. Meal windows.
  for (const e of events) {
    if (e.type !== 'MEAL_BREAK') continue
    const start = toMinutes(e.startTime)
    const isLunch = start < 15 * 60
    const ok = isLunch ? isLunchStartAllowed(start, settings) : isDinnerAllowed(start, settings)
    if (!ok) {
      conflicts.push({
        id: nextId(),
        severity: 'WARNING',
        title: 'ארוחה מחוץ לחלון המותר',
        description: isLunch
          ? `"${e.title}" בתאריך ${e.date} מחוץ לחלון (התחלה בין ${settings.lunchWindow.earliestStart} ל-${settings.lunchWindow.latestStart}).`
          : `"${e.title}" בתאריך ${e.date} מחוץ לחלון (התחלה בין ${settings.dinnerWindow.earliestStart} ל-${settings.dinnerWindow.latestStart}, סיום עד ${settings.dinnerWindow.latestEnd}).`,
        eventIds: [e.id],
        trainingIds: [training.id],
        suggestedResolutionIds: [],
        canOverride: true
      })
    }
  }

  // 4. Guest lecture data hygiene.
  if (lecturers) {
    for (const e of events) {
      if (e.type !== 'GUEST_LECTURE') continue
      const lecturer = lecturers.find((l) => l.id === e.lecturerId)
      if (!lecturer) continue
      if (!lecturer.email || !lecturer.email.includes('@')) {
        conflicts.push({
          id: nextId(),
          severity: 'INFO',
          title: 'למרצה חסרה כתובת דוא״ל תקינה',
          description: `לא ניתן לשלוח תזכורת אוטומטית עבור "${e.title}" ללא דוא״ל תקין של המרצה.`,
          eventIds: [e.id],
          trainingIds: [training.id],
          suggestedResolutionIds: [],
          canOverride: true
        })
      }
    }
  }

  // 5. Events on commander-locked days.
  if (lockedDates && lockedDates.length > 0) {
    const locked = new Set(lockedDates)
    for (const e of events) {
      if (locked.has(e.date) && !isHardEvent(e)) continue
    }
    // Locked days block *changes*, not existing content — no conflicts emitted here.
  }

  return conflicts
}
