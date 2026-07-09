import { db } from '@/app/dbStore'
import type { Schedule, ScheduleEvent, Training } from '@/types'
import { newId } from '@/lib/ids'
import { nowISO } from '@/lib/time'
import { addNotification } from './notificationService'

function findTraining(trainingId: string): Training | null {
  return db.get().trainings.find((t) => t.id === trainingId) ?? null
}

function findSchedule(id: string | undefined): Schedule | null {
  if (!id) return null
  return db.get().schedules.find((s) => s.id === id) ?? null
}

function saveSchedule(updated: Schedule): void {
  db.patch({
    schedules: db.get().schedules.map((s) =>
      s.id === updated.id ? { ...updated, updatedAt: nowISO() } : s
    )
  })
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  return findSchedule(id)
}

export async function getPublished(trainingId: string): Promise<Schedule | null> {
  return findSchedule(findTraining(trainingId)?.publishedScheduleId)
}

export async function getDraft(trainingId: string): Promise<Schedule | null> {
  return findSchedule(findTraining(trainingId)?.draftScheduleId)
}

/** Draft always exists for editing; clone the published schedule if missing. */
export async function ensureDraft(trainingId: string): Promise<Schedule> {
  const existing = await getDraft(trainingId)
  if (existing) return existing

  const training = findTraining(trainingId)
  if (!training) throw new Error(`Training not found: ${trainingId}`)

  const published = findSchedule(training.publishedScheduleId)
  const now = nowISO()
  const draftId = newId('schedule')
  const draft: Schedule = {
    id: draftId,
    trainingId,
    versionNumber: (published?.versionNumber ?? 0) + 1,
    status: 'DRAFT',
    events: (published?.events ?? []).map((e) => ({
      ...e,
      id: newId('evt'),
      scheduleId: draftId
    })),
    lockedDates: [...(published?.lockedDates ?? [])],
    generatedFromImportIds: [...(published?.generatedFromImportIds ?? [])],
    createdAt: now,
    updatedAt: now
  }
  db.patch({
    schedules: [...db.get().schedules, draft],
    trainings: db
      .get()
      .trainings.map((t) => (t.id === trainingId ? { ...t, draftScheduleId: draftId } : t))
  })
  return draft
}

export async function upsertDraftEvent(
  trainingId: string,
  event: ScheduleEvent
): Promise<Schedule> {
  const draft = await ensureDraft(trainingId)
  const exists = draft.events.some((e) => e.id === event.id)
  const events = exists
    ? draft.events.map((e) => (e.id === event.id ? { ...event, updatedAt: nowISO() } : e))
    : [...draft.events, { ...event, scheduleId: draft.id }]
  const updated = { ...draft, events }
  saveSchedule(updated)
  return updated
}

export async function removeDraftEvent(trainingId: string, eventId: string): Promise<Schedule> {
  const draft = await ensureDraft(trainingId)
  const updated = { ...draft, events: draft.events.filter((e) => e.id !== eventId) }
  saveSchedule(updated)
  return updated
}

export async function moveDraftEvent(
  trainingId: string,
  eventId: string,
  target: { date: string; startTime: string; endTime: string }
): Promise<Schedule> {
  const draft = await ensureDraft(trainingId)
  const events = draft.events.map((e) =>
    e.id === eventId
      ? { ...e, ...target, updatedAt: nowISO() }
      : e
  )
  const updated = { ...draft, events }
  saveSchedule(updated)
  return updated
}

/**
 * Swap two draft events' positions (Lego-style). Each takes the other's
 * date/start/end. Locked/full-day events are never swapped by callers.
 */
export async function swapDraftEvents(
  trainingId: string,
  aId: string,
  bId: string
): Promise<Schedule> {
  const draft = await ensureDraft(trainingId)
  const a = draft.events.find((e) => e.id === aId)
  const b = draft.events.find((e) => e.id === bId)
  if (!a || !b) return draft
  const now = nowISO()
  const events = draft.events.map((e) => {
    if (e.id === aId) return { ...e, date: b.date, startTime: b.startTime, endTime: b.endTime, updatedAt: now }
    if (e.id === bId) return { ...e, date: a.date, startTime: a.startTime, endTime: a.endTime, updatedAt: now }
    return e
  })
  const updated = { ...draft, events }
  saveSchedule(updated)
  return updated
}

export async function setDayLock(
  trainingId: string,
  date: string,
  locked: boolean
): Promise<Schedule> {
  const draft = await ensureDraft(trainingId)
  const lockedDates = new Set(draft.lockedDates ?? [])
  if (locked) lockedDates.add(date)
  else lockedDates.delete(date)
  const updated = { ...draft, lockedDates: [...lockedDates] }
  saveSchedule(updated)
  return updated
}

/** Replace the entire draft (used by the generation flow). */
export async function replaceDraft(trainingId: string, schedule: Schedule): Promise<Schedule> {
  const training = findTraining(trainingId)
  if (!training) throw new Error(`Training not found: ${trainingId}`)
  const others = db.get().schedules.filter((s) => s.id !== training.draftScheduleId)
  const stored = { ...schedule, status: 'DRAFT' as const, trainingId, updatedAt: nowISO() }
  db.patch({
    schedules: [...others, stored],
    trainings: db
      .get()
      .trainings.map((t) => (t.id === trainingId ? { ...t, draftScheduleId: stored.id } : t))
  })
  return stored
}

export interface PublishOptions {
  publishedBy: string
  changeSummary?: string
  commanderNote?: string
  notifySoldiers?: boolean
}

/**
 * Publish the draft: archive current published (keep 2 previous), promote the
 * draft, open a fresh draft cloned from it, notify soldiers.
 */
export async function publishDraft(trainingId: string, opts: PublishOptions): Promise<Schedule> {
  const training = findTraining(trainingId)
  if (!training) throw new Error(`Training not found: ${trainingId}`)
  const draft = await ensureDraft(trainingId)
  const now = nowISO()

  const oldPublished = findSchedule(training.publishedScheduleId)
  let schedules = db.get().schedules

  // Archive current published and retain only the last 2 previous versions.
  let previousIds = training.previousPublishedScheduleIds
  if (oldPublished) {
    schedules = schedules.map((s) =>
      s.id === oldPublished.id ? { ...s, status: 'PREVIOUS' as const } : s
    )
    previousIds = [oldPublished.id, ...previousIds]
  }
  const keptPreviousIds = previousIds.slice(0, 2)
  const droppedIds = previousIds.slice(2)
  schedules = schedules.filter((s) => !droppedIds.includes(s.id))

  // Promote the draft.
  const published: Schedule = {
    ...draft,
    status: 'PUBLISHED',
    changeSummary: opts.changeSummary ?? draft.changeSummary,
    commanderNote: opts.commanderNote ?? draft.commanderNote,
    publishedAt: now,
    publishedBy: opts.publishedBy,
    updatedAt: now
  }
  schedules = schedules.map((s) => (s.id === draft.id ? published : s))

  // Open a fresh draft that continues from the newly published version.
  const newDraftId = newId('schedule')
  const newDraft: Schedule = {
    ...published,
    id: newDraftId,
    status: 'DRAFT',
    versionNumber: published.versionNumber + 1,
    events: published.events.map((e) => ({ ...e, id: newId('evt'), scheduleId: newDraftId })),
    changeSummary: undefined,
    commanderNote: undefined,
    publishedAt: undefined,
    publishedBy: undefined,
    createdAt: now,
    updatedAt: now
  }
  schedules = [...schedules, newDraft]

  db.patch({
    schedules,
    trainings: db.get().trainings.map((t) =>
      t.id === trainingId
        ? {
            ...t,
            publishedScheduleId: published.id,
            draftScheduleId: newDraftId,
            previousPublishedScheduleIds: keptPreviousIds,
            updatedAt: now
          }
        : t
    )
  })

  if (opts.notifySoldiers !== false) {
    await addNotification({
      kind: 'SCHEDULE_PUBLISHED',
      title: 'פורסם לו״ז מעודכן להכשרה',
      body: opts.changeSummary,
      role: 'SOLDIER',
      trainingId
    })
  }

  return published
}

/** Throw away draft edits and re-clone from the published schedule. */
export async function discardDraft(trainingId: string): Promise<Schedule> {
  const training = findTraining(trainingId)
  if (!training) throw new Error(`Training not found: ${trainingId}`)
  db.patch({
    schedules: db.get().schedules.filter((s) => s.id !== training.draftScheduleId),
    trainings: db
      .get()
      .trainings.map((t) => (t.id === trainingId ? { ...t, draftScheduleId: undefined } : t))
  })
  return ensureDraft(trainingId)
}

export interface VersionInfo {
  schedule: Schedule
  label: 'CURRENT' | 'PREVIOUS_1' | 'PREVIOUS_2' | 'DRAFT'
}

export async function listVersions(trainingId: string): Promise<VersionInfo[]> {
  const training = findTraining(trainingId)
  if (!training) return []
  const result: VersionInfo[] = []
  const draft = findSchedule(training.draftScheduleId)
  if (draft) result.push({ schedule: draft, label: 'DRAFT' })
  const published = findSchedule(training.publishedScheduleId)
  if (published) result.push({ schedule: published, label: 'CURRENT' })
  training.previousPublishedScheduleIds.forEach((id, i) => {
    const s = findSchedule(id)
    if (s) result.push({ schedule: s, label: i === 0 ? 'PREVIOUS_1' : 'PREVIOUS_2' })
  })
  return result
}

/**
 * A revert is "safe" only when it does not change linked shared events —
 * published shared/hard changes must be renegotiated, not rolled back.
 */
export function isRevertSafe(current: Schedule | null, target: Schedule): boolean {
  const key = (e: ScheduleEvent) => `${e.sharedGroupId}|${e.date}|${e.startTime}|${e.endTime}`
  const sharedOf = (s: Schedule | null) =>
    (s?.events ?? [])
      .filter((e) => e.sharedGroupId)
      .map(key)
      .sort()
      .join(';')
  return sharedOf(current) === sharedOf(target)
}

export async function revertToVersion(
  trainingId: string,
  targetScheduleId: string,
  publishedBy: string
): Promise<{ ok: boolean; reason?: string }> {
  const training = findTraining(trainingId)
  if (!training) return { ok: false, reason: 'training-not-found' }
  const target = findSchedule(targetScheduleId)
  if (!target) return { ok: false, reason: 'version-not-found' }
  const current = findSchedule(training.publishedScheduleId)
  if (!isRevertSafe(current, target)) return { ok: false, reason: 'unsafe-shared-change' }

  // Reverting = republishing the old content as a new version (linear history).
  const draft = await ensureDraft(trainingId)
  const restored: Schedule = {
    ...draft,
    events: target.events.map((e) => ({ ...e, id: newId('evt'), scheduleId: draft.id })),
    lockedDates: [...(target.lockedDates ?? [])]
  }
  saveSchedule(restored)
  await publishDraft(trainingId, {
    publishedBy,
    changeSummary: `שחזור לגרסה ${target.versionNumber}`
  })
  return { ok: true }
}
