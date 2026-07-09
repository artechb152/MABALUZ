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

/** Regular training rhythm: formation, content blocks, meals, evening slot. */
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

    if (dow === 5) {
      // Friday: short day (08:00-14:00)
      events.push(
        makeEvent({
          trainingId,
          title: title(0),
          type: 'FLEXIBLE_CONTENT',
          flexibilityLevel: 'FLEXIBLE',
          date,
          startTime: '08:15',
          endTime: '11:00'
        }),
        makeEvent({
          trainingId,
          title: 'סיכום שבוע ופעילות צוותית',
          type: 'TEAM_ACTIVITY',
          flexibilityLevel: 'FLEXIBLE',
          date,
          startTime: '11:00',
          endTime: '13:00'
        })
      )
      continue
    }

    // Sunday-Thursday
    events.push(
      makeEvent({
        trainingId,
        title: title(0),
        type: 'FLEXIBLE_CONTENT',
        flexibilityLevel: 'FLEXIBLE',
        date,
        startTime: '08:15',
        endTime: '10:00'
      }),
      makeEvent({
        trainingId,
        title: title(1),
        type: 'FLEXIBLE_CONTENT',
        flexibilityLevel: 'FLEXIBLE',
        date,
        startTime: '10:15',
        endTime: '12:00'
      }),
      makeEvent({
        trainingId,
        title: 'ארוחת צהריים והפסקה',
        type: 'MEAL_BREAK',
        flexibilityLevel: 'SEMI_FLEXIBLE',
        date,
        startTime: '12:00',
        endTime: '13:00'
      }),
      makeEvent({
        trainingId,
        title: title(2),
        type: 'FLEXIBLE_CONTENT',
        flexibilityLevel: 'FLEXIBLE',
        date,
        startTime: '13:00',
        endTime: '15:00'
      }),
      makeEvent({
        trainingId,
        title: title(3),
        type: 'FLEXIBLE_CONTENT',
        flexibilityLevel: 'FLEXIBLE',
        date,
        startTime: '15:15',
        endTime: '17:00'
      }),
      makeEvent({
        trainingId,
        title: title(4),
        type: 'FLEXIBLE_CONTENT',
        flexibilityLevel: 'FLEXIBLE',
        date,
        startTime: '17:00',
        endTime: '18:00'
      }),
      makeEvent({
        trainingId,
        title: 'ארוחת ערב והפסקה',
        type: 'MEAL_BREAK',
        flexibilityLevel: 'SEMI_FLEXIBLE',
        date,
        startTime: '18:00',
        endTime: '19:00'
      }),
      makeEvent(
        dow === 0 || dow === 3
          ? {
              trainingId,
              title: 'זמן מפקד',
              type: 'COMMANDER_TIME',
              flexibilityLevel: 'SEMI_FLEXIBLE',
              date,
              startTime: '19:00',
              endTime: '20:00'
            }
          : {
              trainingId,
              title: 'פעילות צוותית',
              type: 'TEAM_ACTIVITY',
              flexibilityLevel: 'FLEXIBLE',
              date,
              startTime: '19:00',
              endTime: '20:00'
            }
      )
    )
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

const intelDraftEvents = placeSpecial(
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
)

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
    pendingChangeRequestIds: ['screq-1']
  }
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
    approvals: [
      {
        trainingId: TRAINING_OPS_ID,
        commanderId: 'user-commander-shira',
        status: 'APPROVED',
        decidedAt: '2026-07-06T14:00:00.000Z'
      },
      { trainingId: TRAINING_INTEL_ID, commanderId: 'user-commander-noam', status: 'PENDING' }
    ],
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
