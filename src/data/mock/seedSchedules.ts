import type {
  AppNotification,
  GuestLectureDetails,
  Schedule,
  ScheduleEvent,
  SharedEventChangeRequest,
  SharedEventGroup
} from '@/types'
import { addDaysISO, dayOfWeek, daysBetween, timeRangesOverlap, toMinutes, todayISO } from '@/lib/time'
import { TRAINING_INTEL_ID, TRAINING_OPS_ID } from './trainings'

const SEED_TIME = '2026-01-01T08:00:00.000Z'
const today = todayISO()

/** First Sunday-Thursday day at or after the given date (specials avoid Fri/Sat). */
function nextWorkdayISO(dateISO: string): string {
  let d = dateISO
  while (dayOfWeek(d) === 5 || dayOfWeek(d) === 6) d = addDaysISO(d, 1)
  return d
}

let seedCounter = 0
function nextEventId(): string {
  seedCounter += 1
  return `evt-seed-${seedCounter}`
}

type EventSeed = Pick<
  ScheduleEvent,
  'trainingId' | 'title' | 'type' | 'flexibilityLevel' | 'date' | 'startTime' | 'endTime'
> &
  Partial<ScheduleEvent>

function makeEvent(seed: EventSeed): ScheduleEvent {
  return {
    id: nextEventId(),
    isLocked: false,
    visibleToSoldiers: true,
    createdBy: 'seed',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
    durationMinutes: toMinutes(seed.endTime) - toMinutes(seed.startTime),
    ...seed
  }
}

/** Insert a special event, removing any overlapping generic content that day. */
function placeSpecial(events: ScheduleEvent[], special: ScheduleEvent): ScheduleEvent[] {
  const kept = events.filter((e) => {
    if (e.date !== special.date) return true
    if (special.isFullDay) return false
    return !timeRangesOverlap(e.startTime, e.endTime, special.startTime, special.endTime)
  })
  kept.push(special)
  return kept
}

// A single block within a day template. `c(n)` slots pull rotating content
// titles; fixed strings are meals/formation/team/commander blocks.
interface BlockSpec {
  title: string | { c: number }
  type: ScheduleEvent['type']
  flex: ScheduleEvent['flexibilityLevel']
  start: string
  end: string
}

const MEAL_NOON = 'ארוחת צהריים והפסקה'
const MEAL_EVE = 'ארוחת ערב והפסקה'

// Six deterministic weekday templates (rotated by day index) with varied start
// times and durations — 15m formations, 30/45m short items, 1.5–3h long ones —
// so the grid reads like a real, uneven schedule. All within 08:00–20:00.
const WEEKDAY_TEMPLATES: BlockSpec[][] = [
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:15', end: '09:00' },
    { title: { c: 1 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '09:15', end: '11:15' },
    { title: { c: 2 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '11:15', end: '11:45' },
    { title: MEAL_NOON, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '12:30', end: '13:15' },
    { title: { c: 3 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '13:15', end: '14:45' },
    { title: { c: 4 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '15:00', end: '15:45' },
    { title: 'פעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '16:00', end: '18:00' },
    { title: MEAL_EVE, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '18:30', end: '19:15' },
    { title: 'זמן מפקד', type: 'COMMANDER_TIME', flex: 'SEMI_FLEXIBLE', start: '19:30', end: '20:00' }
  ],
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:15', end: '10:45' },
    { title: { c: 1 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '11:00', end: '11:30' },
    { title: { c: 2 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '11:45', end: '12:30' },
    { title: MEAL_NOON, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '12:45', end: '13:45' },
    { title: { c: 3 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '13:45', end: '16:45' },
    { title: { c: 4 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '17:00', end: '17:30' },
    { title: MEAL_EVE, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '18:00', end: '18:45' },
    { title: 'פעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '19:00', end: '20:00' }
  ],
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:15', end: '08:45' },
    { title: { c: 1 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:45', end: '09:30' },
    { title: { c: 2 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '09:45', end: '10:30' },
    { title: { c: 3 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '10:45', end: '12:15' },
    { title: MEAL_NOON, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '12:15', end: '13:00' },
    { title: { c: 4 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '13:00', end: '15:00' },
    { title: 'פעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '15:15', end: '16:00' },
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '16:00', end: '17:30' },
    { title: MEAL_EVE, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '18:15', end: '19:00' },
    { title: 'זמן מפקד', type: 'COMMANDER_TIME', flex: 'SEMI_FLEXIBLE', start: '19:15', end: '20:00' }
  ],
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:30', end: '10:00' },
    { title: { c: 1 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '10:15', end: '11:00' },
    { title: { c: 2 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '11:00', end: '12:00' },
    { title: MEAL_NOON, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '13:00', end: '14:00' },
    { title: { c: 3 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '14:00', end: '15:30' },
    { title: { c: 4 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '15:45', end: '16:30' },
    { title: 'פעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '16:45', end: '18:15' },
    { title: MEAL_EVE, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '18:30', end: '19:15' },
    { title: 'זמן מפקד', type: 'COMMANDER_TIME', flex: 'SEMI_FLEXIBLE', start: '19:15', end: '20:00' }
  ],
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:15', end: '09:45' },
    { title: { c: 1 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '09:45', end: '10:15' },
    { title: { c: 2 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '10:30', end: '12:30' },
    { title: MEAL_NOON, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '12:30', end: '13:15' },
    { title: { c: 3 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '13:30', end: '14:15' },
    { title: { c: 4 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '14:15', end: '15:00' },
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '15:15', end: '17:45' },
    { title: MEAL_EVE, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '18:15', end: '19:00' },
    { title: 'פעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '19:15', end: '20:00' }
  ],
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:15', end: '09:00' },
    { title: { c: 1 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '09:15', end: '12:15' },
    { title: MEAL_NOON, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '12:30', end: '13:30' },
    { title: { c: 2 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '13:30', end: '14:15' },
    { title: { c: 3 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '14:30', end: '15:00' },
    { title: { c: 4 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '15:00', end: '17:00' },
    { title: 'פעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '17:15', end: '18:15' },
    { title: MEAL_EVE, type: 'MEAL_BREAK', flex: 'SEMI_FLEXIBLE', start: '18:30', end: '19:15' },
    { title: 'זמן מפקד', type: 'COMMANDER_TIME', flex: 'SEMI_FLEXIBLE', start: '19:30', end: '20:00' }
  ]
]

const FRIDAY_TEMPLATES: BlockSpec[][] = [
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:15', end: '10:45' },
    { title: 'סיכום שבוע ופעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '11:00', end: '13:00' }
  ],
  [
    { title: { c: 0 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '08:15', end: '09:00' },
    { title: { c: 1 }, type: 'FLEXIBLE_CONTENT', flex: 'FLEXIBLE', start: '09:15', end: '11:15' },
    { title: 'סיכום שבוע ופעילות צוותית', type: 'TEAM_ACTIVITY', flex: 'FLEXIBLE', start: '11:30', end: '13:00' }
  ]
]

/** Regular training rhythm: a 15-minute formation plus a varied day template. */
function buildBaseWeekEvents(
  trainingId: string,
  startDate: string,
  endDate: string,
  contentTitles: string[]
): ScheduleEvent[] {
  const events: ScheduleEvent[] = []
  const totalDays = daysBetween(startDate, endDate)

  for (let i = 0; i <= totalDays; i++) {
    const date = addDaysISO(startDate, i)
    const dow = dayOfWeek(date)
    if (dow === 6) continue // Saturday disabled by default settings

    const title = (offset: number) => contentTitles[(i + offset) % contentTitles.length]
    const resolve = (t: BlockSpec['title']) => (typeof t === 'string' ? t : title(t.c))

    events.push(
      makeEvent({
        trainingId,
        title: 'מסדר בוקר',
        type: 'FORMATION',
        flexibilityLevel: 'SEMI_FLEXIBLE',
        date,
        startTime: '08:00',
        endTime: '08:15'
      })
    )

    const template =
      dow === 5
        ? FRIDAY_TEMPLATES[i % FRIDAY_TEMPLATES.length]
        : WEEKDAY_TEMPLATES[i % WEEKDAY_TEMPLATES.length]

    for (const b of template) {
      events.push(
        makeEvent({
          trainingId,
          title: resolve(b.title),
          type: b.type,
          flexibilityLevel: b.flex,
          date,
          startTime: b.start,
          endTime: b.end
        })
      )
    }
  }
  return events
}

const intelTitles = [
  'מבוא לעבודה מודיעינית',
  'ניתוח מידע ומקורות',
  'כתיבה מודיעינית',
  'מפות והתמצאות',
  'תרגול צוותי',
  'תרגול מסכם'
]

const opsTitles = [
  'הפעלת מערכות',
  'נהלים ובטיחות',
  'תרגול תפעול',
  'עבודת צוות',
  'תחזוקה שוטפת',
  'תרגול מסכם'
]

// --- Special (hard) events, placed relative to today -----------------------

export const intelStart = addDaysISO(today, -7)
export const intelEnd = addDaysISO(today, 13)
export const opsStart = addDaysISO(today, -14)
export const opsEnd = addDaysISO(today, 7)

export const sharedLectureDate = nextWorkdayISO(addDaysISO(today, 2))
export const intelGuestLectureDate = nextWorkdayISO(addDaysISO(today, 1))
export const opsGuestLectureDate = nextWorkdayISO(addDaysISO(today, 4))
export const peakDayDate = nextWorkdayISO(addDaysISO(today, 6))
export const heritageTourDate = nextWorkdayISO(addDaysISO(today, 8))

export const SHARED_SAFETY_GROUP_ID = 'shared-safety-1'

function buildIntelPublishedEvents(): {
  events: ScheduleEvent[]
  sharedEventId: string
  guestLectureEventId: string
} {
  let events = buildBaseWeekEvents(TRAINING_INTEL_ID, intelStart, intelEnd, intelTitles)

  // Opening lecture on day one.
  events = placeSpecial(
    events,
    makeEvent({
      trainingId: TRAINING_INTEL_ID,
      title: 'הרצאת פתיחה',
      type: 'FLEXIBLE_CONTENT',
      flexibilityLevel: 'SEMI_FLEXIBLE',
      date: nextWorkdayISO(intelStart),
      startTime: '08:15',
      endTime: '10:00',
      shortDescription: 'פתיחת ההכשרה והצגת מטרות',
      location: 'אולם מרכזי'
    })
  )

  // Linked shared event (safety lecture) — appears in both trainings.
  const sharedEvent = makeEvent({
    trainingId: TRAINING_INTEL_ID,
    title: 'לו״ז משותף: הרצאת בטיחות',
    type: 'SHARED',
    flexibilityLevel: 'LOCKED_SHARED',
    date: sharedLectureDate,
    startTime: '10:15',
    endTime: '12:00',
    isLocked: true,
    lockReason: 'לו״ז משותף מקושר',
    sharedGroupId: SHARED_SAFETY_GROUP_ID,
    location: 'אולם מרכזי'
  })
  events = placeSpecial(events, sharedEvent)

  // Known guest lecture (tomorrow-ish).
  const guestLecture = makeEvent({
    trainingId: TRAINING_INTEL_ID,
    title: 'הרצאת חוץ: מבוא לעבודה מודיעינית',
    type: 'GUEST_LECTURE',
    flexibilityLevel: 'LOCKED_GUEST_LECTURE',
    date: intelGuestLectureDate,
    startTime: '13:00',
    endTime: '14:30',
    isLocked: true,
    lockReason: 'מועד מתואם עם המרצה',
    lecturerId: 'lecturer-amit-barak',
    instructorName: 'ד״ר עמית ברק',
    location: 'אולם הרצאות',
    showBasicDetailsOnly: true
  })
  events = placeSpecial(events, guestLecture)

  // Full-day peak day.
  events = placeSpecial(
    events,
    makeEvent({
      trainingId: TRAINING_INTEL_ID,
      title: 'יום שיא: מטווחים',
      type: 'PEAK_DAY',
      flexibilityLevel: 'LOCKED_PEAK_DAY',
      date: peakDayDate,
      startTime: '08:00',
      endTime: '20:00',
      isFullDay: true,
      isLocked: true,
      lockReason: 'יום שיא מתוכנן',
      peakDayId: 'peak-ranges-1',
      location: 'מטווח (מיקום מדויק יפורסם)',
      showBasicDetailsOnly: true,
      equipment: ['אפוד', 'קסדה', 'מים']
    })
  )

  // Heritage tour afternoon.
  events = placeSpecial(
    events,
    makeEvent({
      trainingId: TRAINING_INTEL_ID,
      title: 'סיור מורשת',
      type: 'TEAM_ACTIVITY',
      flexibilityLevel: 'FLEXIBLE',
      date: heritageTourDate,
      startTime: '13:00',
      endTime: '17:00',
      location: 'מחוץ לבסיס'
    })
  )

  // Reserved time for future guest lectures near the end of the training.
  events = placeSpecial(
    events,
    makeEvent({
      trainingId: TRAINING_INTEL_ID,
      title: 'זמן שמור להרצאות חוץ',
      type: 'CUSTOM',
      flexibilityLevel: 'SEMI_FLEXIBLE',
      date: nextWorkdayISO(addDaysISO(intelEnd, -2)),
      startTime: '13:00',
      endTime: '15:00',
      visibleToSoldiers: false
    })
  )

  return { events, sharedEventId: sharedEvent.id, guestLectureEventId: guestLecture.id }
}

function buildOpsPublishedEvents(): {
  events: ScheduleEvent[]
  sharedEventId: string
  guestLectureEventId: string
} {
  let events = buildBaseWeekEvents(TRAINING_OPS_ID, opsStart, opsEnd, opsTitles)

  const sharedEvent = makeEvent({
    trainingId: TRAINING_OPS_ID,
    title: 'לו״ז משותף: הרצאת בטיחות',
    type: 'SHARED',
    flexibilityLevel: 'LOCKED_SHARED',
    date: sharedLectureDate,
    startTime: '10:15',
    endTime: '12:00',
    isLocked: true,
    lockReason: 'לו״ז משותף מקושר',
    sharedGroupId: SHARED_SAFETY_GROUP_ID,
    location: 'אולם מרכזי'
  })
  events = placeSpecial(events, sharedEvent)

  const guestLecture = makeEvent({
    trainingId: TRAINING_OPS_ID,
    title: 'הרצאת חוץ: מיומנויות הדרכה',
    type: 'GUEST_LECTURE',
    flexibilityLevel: 'LOCKED_GUEST_LECTURE',
    date: opsGuestLectureDate,
    startTime: '13:00',
    endTime: '14:30',
    isLocked: true,
    lockReason: 'מועד מתואם עם המרצה',
    lecturerId: 'lecturer-roni-shalev',
    instructorName: 'גב׳ רוני שלו',
    location: 'כיתה 3',
    showBasicDetailsOnly: true
  })
  events = placeSpecial(events, guestLecture)

  return { events, sharedEventId: sharedEvent.id, guestLectureEventId: guestLecture.id }
}

// --- Assemble schedules -----------------------------------------------------

function cloneAsDraft(events: ScheduleEvent[], scheduleId: string): ScheduleEvent[] {
  return events.map((e) => ({ ...e, id: `${e.id}-d`, scheduleId }))
}

const intel = buildIntelPublishedEvents()
const ops = buildOpsPublishedEvents()

const intelPrevEvents = buildBaseWeekEvents(TRAINING_INTEL_ID, intelStart, intelEnd, intelTitles)

// Two more guest lectures this week so the lectures deck has several cards.
export const intelDraftLecture1 = makeEvent({
  trainingId: TRAINING_INTEL_ID,
  scheduleId: 'schedule-intel-draft',
  title: 'הרצאת חוץ: לוחמת סייבר',
  type: 'GUEST_LECTURE',
  flexibilityLevel: 'LOCKED_GUEST_LECTURE',
  date: nextWorkdayISO(addDaysISO(today, 2)),
  startTime: '09:00',
  endTime: '10:30',
  isLocked: true,
  lockReason: 'מועד מתואם עם המרצה',
  lecturerId: 'lecturer-roni-shalev',
  instructorName: 'סא״ל (מיל׳) רוני שלו',
  location: 'אולם הרצאות',
  showBasicDetailsOnly: true
})
export const intelDraftLecture2 = makeEvent({
  trainingId: TRAINING_INTEL_ID,
  scheduleId: 'schedule-intel-draft',
  title: 'הרצאת חוץ: אתיקה במודיעין',
  type: 'GUEST_LECTURE',
  flexibilityLevel: 'LOCKED_GUEST_LECTURE',
  date: nextWorkdayISO(addDaysISO(today, 5)),
  startTime: '15:00',
  endTime: '16:30',
  isLocked: true,
  lockReason: 'מועד מתואם עם המרצה',
  lecturerId: 'lecturer-amit-barak',
  instructorName: 'ד״ר עמית ברק',
  location: 'כיתה 3',
  showBasicDetailsOnly: true
})

// Deliberately overlapping events (appended raw, bypassing placeSpecial) so the
// draft carries a real mix of blocking and warning conflicts.
const intelDraftConflicts: ScheduleEvent[] = [
  // Flexible over the locked shared safety lecture -> WARNING.
  makeEvent({
    trainingId: TRAINING_INTEL_ID,
    scheduleId: 'schedule-intel-draft',
    title: 'חזרה על חומר',
    type: 'FLEXIBLE_CONTENT',
    flexibilityLevel: 'FLEXIBLE',
    date: sharedLectureDate,
    startTime: '11:00',
    endTime: '11:45'
  }),
  // Locked briefing over the locked shared lecture -> BLOCKING.
  makeEvent({
    trainingId: TRAINING_INTEL_ID,
    scheduleId: 'schedule-intel-draft',
    title: 'תדריך מבצעי',
    type: 'FORMATION',
    flexibilityLevel: 'SEMI_FLEXIBLE',
    date: sharedLectureDate,
    startTime: '11:30',
    endTime: '12:30',
    isLocked: true,
    lockReason: 'תואם מראש'
  }),
  // Flexible over the guest lecture -> WARNING.
  makeEvent({
    trainingId: TRAINING_INTEL_ID,
    scheduleId: 'schedule-intel-draft',
    title: 'תרגול כיתתי',
    type: 'FLEXIBLE_CONTENT',
    flexibilityLevel: 'FLEXIBLE',
    date: intelGuestLectureDate,
    startTime: '13:30',
    endTime: '14:15'
  }),
  // Locked visit over the guest lecture -> BLOCKING.
  makeEvent({
    trainingId: TRAINING_INTEL_ID,
    scheduleId: 'schedule-intel-draft',
    title: 'ביקור מפקד חטיבה',
    type: 'CUSTOM',
    flexibilityLevel: 'SEMI_FLEXIBLE',
    date: intelGuestLectureDate,
    startTime: '14:00',
    endTime: '15:00',
    isLocked: true,
    lockReason: 'מועד קבוע'
  }),
  // Two flexible items colliding -> WARNING.
  makeEvent({
    trainingId: TRAINING_INTEL_ID,
    scheduleId: 'schedule-intel-draft',
    title: 'שיעור השלמה א׳',
    type: 'FLEXIBLE_CONTENT',
    flexibilityLevel: 'FLEXIBLE',
    date: nextWorkdayISO(addDaysISO(today, 3)),
    startTime: '10:00',
    endTime: '11:00'
  }),
  makeEvent({
    trainingId: TRAINING_INTEL_ID,
    scheduleId: 'schedule-intel-draft',
    title: 'שיעור השלמה ב׳',
    type: 'FLEXIBLE_CONTENT',
    flexibilityLevel: 'FLEXIBLE',
    date: nextWorkdayISO(addDaysISO(today, 3)),
    startTime: '10:30',
    endTime: '11:30'
  })
]

const intelDraftEvents = [
  ...placeSpecial(
    cloneAsDraft(intel.events, 'schedule-intel-draft'),
    makeEvent({
      trainingId: TRAINING_INTEL_ID,
      scheduleId: 'schedule-intel-draft',
      title: 'תרגול ניווט לילה',
      type: 'FLEXIBLE_CONTENT',
      flexibilityLevel: 'FLEXIBLE',
      date: nextWorkdayISO(addDaysISO(today, 3)),
      startTime: '19:00',
      endTime: '20:00',
      commanderNotes: 'טיוטה — טרם פורסם',
      equipment: ['פנס', 'מפה']
    })
  ),
  intelDraftLecture1,
  intelDraftLecture2,
  ...intelDraftConflicts
]

export const mockSchedules: Schedule[] = [
  {
    id: 'schedule-intel-prev1',
    trainingId: TRAINING_INTEL_ID,
    versionNumber: 1,
    status: 'PREVIOUS',
    events: intelPrevEvents.map((e) => ({ ...e, scheduleId: 'schedule-intel-prev1' })),
    generatedFromImportIds: [],
    changeSummary: 'גרסה ראשונית של הלו״ז',
    publishedAt: '2026-06-28T10:00:00.000Z',
    publishedBy: 'user-commander-noam',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'schedule-intel-pub',
    trainingId: TRAINING_INTEL_ID,
    versionNumber: 2,
    status: 'PUBLISHED',
    events: intel.events.map((e) => ({ ...e, scheduleId: 'schedule-intel-pub' })),
    generatedFromImportIds: [],
    changeSummary: 'נוספו הרצאת חוץ, יום שיא ולו״ז משותף',
    commanderNote: 'שימו לב לשינויים בשבוע הקרוב.',
    publishedAt: '2026-07-05T09:00:00.000Z',
    publishedBy: 'user-commander-noam',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'schedule-intel-draft',
    trainingId: TRAINING_INTEL_ID,
    versionNumber: 3,
    status: 'DRAFT',
    events: intelDraftEvents,
    generatedFromImportIds: [],
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'schedule-ops-pub',
    trainingId: TRAINING_OPS_ID,
    versionNumber: 1,
    status: 'PUBLISHED',
    events: ops.events.map((e) => ({ ...e, scheduleId: 'schedule-ops-pub' })),
    generatedFromImportIds: [],
    publishedAt: '2026-06-25T09:00:00.000Z',
    publishedBy: 'user-commander-shira',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'schedule-ops-draft',
    trainingId: TRAINING_OPS_ID,
    versionNumber: 2,
    status: 'DRAFT',
    events: cloneAsDraft(ops.events, 'schedule-ops-draft'),
    generatedFromImportIds: [],
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  }
]

// --- Shared event group + pending change request ----------------------------

export const mockSharedGroups: SharedEventGroup[] = [
  {
    id: SHARED_SAFETY_GROUP_ID,
    title: 'הרצאת בטיחות',
    linkedTrainingIds: [TRAINING_INTEL_ID, TRAINING_OPS_ID],
    createdByTrainingId: TRAINING_OPS_ID,
    createdByUserId: 'user-commander-shira',
    status: 'PENDING_CHANGE_APPROVAL',
    approvals: [
      { trainingId: TRAINING_INTEL_ID, commanderId: 'user-commander-noam', status: 'APPROVED' },
      { trainingId: TRAINING_OPS_ID, commanderId: 'user-commander-shira', status: 'APPROVED' }
    ],
    currentEventIdsByTrainingId: {
      [TRAINING_INTEL_ID]: intel.sharedEventId,
      [TRAINING_OPS_ID]: ops.sharedEventId
    },
    pendingChangeRequestIds: ['screq-1', 'screq-2', 'screq-3']
  }
]

const pendingFromOps = (id: string): SharedEventChangeRequest['approvals'] => [
  {
    trainingId: TRAINING_OPS_ID,
    commanderId: 'user-commander-shira',
    status: 'APPROVED',
    decidedAt: '2026-07-06T14:00:00.000Z',
    note: id
  },
  { trainingId: TRAINING_INTEL_ID, commanderId: 'user-commander-noam', status: 'PENDING' }
]

export const mockChangeRequests: SharedEventChangeRequest[] = [
  {
    id: 'screq-1',
    groupId: SHARED_SAFETY_GROUP_ID,
    requestedByUserId: 'user-commander-shira',
    requestedByTrainingId: TRAINING_OPS_ID,
    requestedAt: '2026-07-06T14:00:00.000Z',
    description: 'הזזת הרצאת הבטיחות לשעה 14:00 באותו יום',
    newDate: sharedLectureDate,
    newStartTime: '14:00',
    newEndTime: '15:45',
    approvals: pendingFromOps('screq-1'),
    status: 'PENDING'
  },
  {
    id: 'screq-2',
    groupId: SHARED_SAFETY_GROUP_ID,
    requestedByUserId: 'user-commander-shira',
    requestedByTrainingId: TRAINING_OPS_ID,
    requestedAt: '2026-07-07T08:00:00.000Z',
    description: 'הקדמת הרצאת הבטיחות ל-08:30 בבוקר',
    newDate: sharedLectureDate,
    newStartTime: '08:30',
    newEndTime: '10:15',
    approvals: pendingFromOps('screq-2'),
    status: 'PENDING'
  },
  {
    id: 'screq-3',
    groupId: SHARED_SAFETY_GROUP_ID,
    requestedByUserId: 'user-commander-shira',
    requestedByTrainingId: TRAINING_OPS_ID,
    requestedAt: '2026-07-08T11:00:00.000Z',
    description: 'העברת הרצאת הבטיחות ליום פעילות אחר',
    newDate: nextWorkdayISO(addDaysISO(today, 8)),
    newStartTime: '10:15',
    newEndTime: '12:00',
    approvals: pendingFromOps('screq-3'),
    status: 'PENDING'
  }
]

// --- Guest lecture operational details ---------------------------------------

export const mockGuestLectureDetails: GuestLectureDetails[] = [
  {
    eventId: intel.guestLectureEventId,
    trainingId: TRAINING_INTEL_ID,
    lecturerId: 'lecturer-amit-barak',
    confirmationStatus: 'NOT_SENT',
    confirmationToken: 'confirm-amit-0001',
    maxDurationMinutes: 90,
    noConfirmationWarnMinutesBefore: 120
  },
  {
    eventId: ops.guestLectureEventId,
    trainingId: TRAINING_OPS_ID,
    lecturerId: 'lecturer-roni-shalev',
    confirmationStatus: 'NOT_SENT',
    confirmationToken: 'confirm-roni-0001',
    maxDurationMinutes: 90,
    noConfirmationWarnMinutesBefore: 120
  },
  {
    eventId: intelDraftLecture1.id,
    trainingId: TRAINING_INTEL_ID,
    lecturerId: 'lecturer-roni-shalev',
    confirmationStatus: 'REMINDER_SENT',
    confirmationToken: 'confirm-roni-int-1',
    maxDurationMinutes: 90,
    noConfirmationWarnMinutesBefore: 120,
    reminderSentAt: SEED_TIME
  },
  {
    eventId: intelDraftLecture2.id,
    trainingId: TRAINING_INTEL_ID,
    lecturerId: 'lecturer-amit-barak',
    confirmationStatus: 'CONFIRMED',
    confirmationToken: 'confirm-amit-int-2',
    maxDurationMinutes: 90,
    noConfirmationWarnMinutesBefore: 120,
    confirmedAt: SEED_TIME
  }
]

export const intelPublishedIds = {
  sharedEventId: intel.sharedEventId,
  guestLectureEventId: intel.guestLectureEventId
}

export const opsPublishedIds = {
  sharedEventId: ops.sharedEventId,
  guestLectureEventId: ops.guestLectureEventId
}

// --- Seed notifications ------------------------------------------------------

export const mockNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    kind: 'SCHEDULE_PUBLISHED',
    title: 'פורסם לו״ז מעודכן להכשרה',
    body: 'נוספו הרצאת חוץ, יום שיא ולו״ז משותף.',
    role: 'SOLDIER',
    trainingId: TRAINING_INTEL_ID,
    createdAt: '2026-07-05T09:00:00.000Z'
  },
  {
    id: 'notif-2',
    kind: 'APPROVAL_REQUEST',
    title: 'בקשת שינוי בלו״ז משותף ממתינה לאישורך',
    body: 'הרצאת בטיחות — הצעה להזזה לשעה 14:00.',
    userId: 'user-commander-noam',
    trainingId: TRAINING_INTEL_ID,
    createdAt: '2026-07-06T14:00:00.000Z'
  }
]
