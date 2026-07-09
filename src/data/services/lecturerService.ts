import { db } from '@/app/dbStore'
import type {
  GuestLectureDetails,
  GuestLecturer,
  Schedule,
  ScheduleEvent,
  ScheduleConflict
} from '@/types'
import { newId } from '@/lib/ids'
import { nowISO, timeRangesOverlap, toMinutes } from '@/lib/time'
import { ensureDraft, upsertDraftEvent, removeDraftEvent, moveDraftEvent } from './scheduleService'
import { addNotification } from './notificationService'

export async function listLecturers(): Promise<GuestLecturer[]> {
  return db.get().lecturers
}

export async function searchLecturers(query: string): Promise<GuestLecturer[]> {
  const q = query.trim()
  if (!q) return db.get().lecturers
  return db
    .get()
    .lecturers.filter(
      (l) =>
        l.fullName.includes(q) ||
        l.role.includes(q) ||
        (l.organization ?? '').includes(q) ||
        l.lectureTypes.some((t) => t.includes(q))
    )
}

export async function getLecturerById(id: string): Promise<GuestLecturer | null> {
  return db.get().lecturers.find((l) => l.id === id) ?? null
}

export async function createLecturer(
  input: Omit<GuestLecturer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GuestLecturer> {
  const now = nowISO()
  const lecturer: GuestLecturer = { ...input, id: newId('lecturer'), createdAt: now, updatedAt: now }
  db.patch({ lecturers: [...db.get().lecturers, lecturer] })
  return lecturer
}

export async function updateLecturer(
  id: string,
  changes: Partial<GuestLecturer>
): Promise<GuestLecturer | null> {
  const lecturers = db.get().lecturers.map((l) =>
    l.id === id ? { ...l, ...changes, id: l.id, updatedAt: nowISO() } : l
  )
  db.patch({ lecturers })
  return lecturers.find((l) => l.id === id) ?? null
}

export async function getLectureDetails(eventId: string): Promise<GuestLectureDetails | null> {
  // Draft clones keep the "-d" suffix of their published counterpart.
  const details = db.get().guestLectureDetails
  return details.find((d) => d.eventId === eventId || `${d.eventId}-d` === eventId) ?? null
}

export function updateLectureDetails(
  eventId: string,
  changes: Partial<GuestLectureDetails>
): void {
  db.patch({
    guestLectureDetails: db
      .get()
      .guestLectureDetails.map((d) =>
        d.eventId === eventId || `${d.eventId}-d` === eventId ? { ...d, ...changes, eventId: d.eventId } : d
      )
  })
}

export interface AddGuestLectureInput {
  trainingId: string
  lecturerId: string
  title: string
  date: string
  startTime: string
  endTime: string
  location?: string
  maxDurationMinutes?: number
  noConfirmationWarnMinutesBefore: number
  createdBy: string
}

export async function addGuestLecture(input: AddGuestLectureInput): Promise<ScheduleEvent> {
  const lecturer = await getLecturerById(input.lecturerId)
  const now = nowISO()
  const event: ScheduleEvent = {
    id: newId('evt'),
    trainingId: input.trainingId,
    title: input.title,
    type: 'GUEST_LECTURE',
    flexibilityLevel: 'LOCKED_GUEST_LECTURE',
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: toMinutes(input.endTime) - toMinutes(input.startTime),
    isLocked: true,
    lockReason: 'מועד מתואם עם המרצה',
    location: input.location,
    lecturerId: input.lecturerId,
    instructorName: lecturer?.fullName,
    visibleToSoldiers: true,
    showBasicDetailsOnly: true,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now
  }
  await upsertDraftEvent(input.trainingId, event)

  const details: GuestLectureDetails = {
    eventId: event.id,
    trainingId: input.trainingId,
    lecturerId: input.lecturerId,
    confirmationStatus: 'NOT_SENT',
    confirmationToken: newId('confirm'),
    maxDurationMinutes: input.maxDurationMinutes,
    noConfirmationWarnMinutesBefore: input.noConfirmationWarnMinutesBefore
  }
  db.patch({ guestLectureDetails: [...db.get().guestLectureDetails, details] })
  return event
}

function findHardConflicts(
  draft: Schedule,
  eventId: string,
  date: string,
  startTime: string,
  endTime: string
): ScheduleConflict[] {
  const hard = draft.events.filter(
    (e) =>
      e.id !== eventId &&
      e.date === date &&
      e.isLocked &&
      timeRangesOverlap(e.startTime, e.endTime, startTime, endTime)
  )
  return hard.map((e) => ({
    id: newId('conflict'),
    severity: 'BLOCKING' as const,
    title: 'התנגשות עם רכיב קשיח',
    description: `המועד החדש מתנגש עם "${e.title}" (${e.startTime}-${e.endTime}).`,
    eventIds: [eventId, e.id],
    trainingIds: [draft.trainingId],
    suggestedResolutionIds: [],
    canOverride: false
  }))
}

export interface CancelLectureInput {
  trainingId: string
  eventId: string
  newDate?: string
  newStartTime?: string
  newEndTime?: string
}

export interface CancelLectureResult {
  ok: boolean
  rescheduled: boolean
  conflicts: ScheduleConflict[]
}

/** "המרצה ביטל" flow: reschedule if a new time was given, otherwise cancel. */
export async function cancelOrRescheduleLecture(
  input: CancelLectureInput
): Promise<CancelLectureResult> {
  const draft = await ensureDraft(input.trainingId)

  if (input.newDate && input.newStartTime && input.newEndTime) {
    const conflicts = findHardConflicts(
      draft,
      input.eventId,
      input.newDate,
      input.newStartTime,
      input.newEndTime
    )
    if (conflicts.length > 0) return { ok: false, rescheduled: false, conflicts }

    await moveDraftEvent(input.trainingId, input.eventId, {
      date: input.newDate,
      startTime: input.newStartTime,
      endTime: input.newEndTime
    })
    updateLectureDetails(input.eventId, { confirmationStatus: 'NOT_SENT', reminderSentAt: undefined })
    return { ok: true, rescheduled: true, conflicts: [] }
  }

  // No new time: remove the lecture; the freed slot becomes flexible spare time.
  await removeDraftEvent(input.trainingId, input.eventId)
  updateLectureDetails(input.eventId, {
    confirmationStatus: 'CANCELLED',
    cancelledAt: nowISO()
  })
  return { ok: true, rescheduled: false, conflicts: [] }
}

/** Mock confirmation route (/lecturer-confirmation/:token) calls this. */
export async function confirmLectureByToken(
  token: string
): Promise<{ ok: boolean; lectureTitle?: string }> {
  const details = db.get().guestLectureDetails.find((d) => d.confirmationToken === token)
  if (!details) return { ok: false }

  updateLectureDetails(details.eventId, {
    confirmationStatus: 'CONFIRMED',
    confirmedAt: nowISO()
  })

  const schedules = db.get().schedules
  const event = schedules
    .flatMap((s) => s.events)
    .find((e) => e.id === details.eventId || e.id === `${details.eventId}-d`)

  const training = db.get().trainings.find((t) => t.id === details.trainingId)
  if (training) {
    await addNotification({
      kind: 'LECTURER_CONFIRMED',
      title: 'המרצה אישר הגעה להרצאה.',
      body: event?.title,
      userId: training.commanderId,
      trainingId: training.id
    })
  }
  return { ok: true, lectureTitle: event?.title }
}
