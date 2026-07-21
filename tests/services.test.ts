import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/app/dbStore'
import { mockUsers } from '@/data/mock/users'
import {
  TRAINING_CONTROL_ID,
  TRAINING_CYBER_ID,
  TRAINING_INTEL_ID,
  TRAINING_OPS_ID
} from '@/data/mock/trainings'
import * as trainingService from '@/data/services/trainingService'
import * as scheduleService from '@/data/services/scheduleService'
import * as lecturerService from '@/data/services/lecturerService'
import * as sharedEventService from '@/data/services/sharedEventService'
import * as notificationService from '@/data/services/notificationService'

const soldier = mockUsers.find((u) => u.id === 'user-soldier-yoav')!
const commanderNoam = mockUsers.find((u) => u.id === 'user-commander-noam')!
const commanderShira = mockUsers.find((u) => u.id === 'user-commander-shira')!
const senior = mockUsers.find((u) => u.id === 'user-senior-daniel')!
const admin = mockUsers.find((u) => u.id === 'user-admin-artech')!

beforeEach(() => {
  db.reset()
})

describe('role-scoped training visibility', () => {
  it('soldier sees only their own training', async () => {
    const trainings = await trainingService.listTrainingsForUser(soldier)
    expect(trainings.map((t) => t.id)).toEqual([TRAINING_INTEL_ID])
  })

  it('training commander is assigned to exactly one training', async () => {
    const trainings = await trainingService.listTrainingsForUser(commanderNoam)
    expect(trainings.map((t) => t.id)).toEqual([TRAINING_INTEL_ID])
  })

  it('senior commander sees all managed trainings', async () => {
    const trainings = await trainingService.listTrainingsForUser(senior)
    expect(trainings.map((t) => t.id).sort()).toEqual(
      [TRAINING_CONTROL_ID, TRAINING_CYBER_ID, TRAINING_INTEL_ID, TRAINING_OPS_ID].sort()
    )
  })

  it('admin sees everything', async () => {
    const trainings = await trainingService.listTrainingsForUser(admin)
    expect(trainings.length).toBeGreaterThanOrEqual(2)
  })
})

describe('draft/publish model', () => {
  it('has separate draft and published schedules seeded', async () => {
    const draft = await scheduleService.getDraft(TRAINING_INTEL_ID)
    const published = await scheduleService.getPublished(TRAINING_INTEL_ID)
    expect(draft?.status).toBe('DRAFT')
    expect(published?.status).toBe('PUBLISHED')
    expect(draft?.id).not.toBe(published?.id)
  })

  it('draft edits do not touch the published schedule', async () => {
    const publishedBefore = await scheduleService.getPublished(TRAINING_INTEL_ID)
    const draft = await scheduleService.ensureDraft(TRAINING_INTEL_ID)
    const someEvent = draft.events.find((e) => e.flexibilityLevel === 'FLEXIBLE')!
    await scheduleService.removeDraftEvent(TRAINING_INTEL_ID, someEvent.id)

    const publishedAfter = await scheduleService.getPublished(TRAINING_INTEL_ID)
    expect(publishedAfter?.events.length).toBe(publishedBefore?.events.length)
  })

  it('publish archives the old version, keeps max 2 previous, opens a new draft', async () => {
    const before = await scheduleService.getPublished(TRAINING_INTEL_ID)
    await scheduleService.publishDraft(TRAINING_INTEL_ID, {
      publishedBy: commanderNoam.id,
      changeSummary: 'בדיקת פרסום'
    })
    const training = (await trainingService.getTrainingById(TRAINING_INTEL_ID))!
    expect(training.previousPublishedScheduleIds[0]).toBe(before!.id)
    expect(training.previousPublishedScheduleIds.length).toBeLessThanOrEqual(2)

    const newPublished = await scheduleService.getPublished(TRAINING_INTEL_ID)
    expect(newPublished?.changeSummary).toBe('בדיקת פרסום')
    const newDraft = await scheduleService.getDraft(TRAINING_INTEL_ID)
    expect(newDraft?.id).not.toBe(newPublished?.id)
    expect(newDraft?.versionNumber).toBe((newPublished?.versionNumber ?? 0) + 1)
  })

  it('publish notifies soldiers of the training', async () => {
    await scheduleService.publishDraft(TRAINING_INTEL_ID, { publishedBy: commanderNoam.id })
    const notifications = await notificationService.listNotificationsForUser(soldier)
    expect(notifications.some((n) => n.kind === 'SCHEDULE_PUBLISHED')).toBe(true)
  })

  it('keeps only 2 previous versions after repeated publishes', async () => {
    for (let i = 0; i < 4; i++) {
      await scheduleService.publishDraft(TRAINING_INTEL_ID, { publishedBy: commanderNoam.id })
    }
    const training = (await trainingService.getTrainingById(TRAINING_INTEL_ID))!
    expect(training.previousPublishedScheduleIds.length).toBe(2)
    const versions = await scheduleService.listVersions(TRAINING_INTEL_ID)
    // draft + current + 2 previous
    expect(versions.length).toBe(4)
  })
})

describe('guest lecturers', () => {
  it('adds a guest lecture with details to the draft', async () => {
    const lecturers = await lecturerService.listLecturers()
    const event = await lecturerService.addGuestLecture({
      trainingId: TRAINING_INTEL_ID,
      lecturerId: lecturers[0].id,
      title: 'הרצאת חוץ: בדיקה',
      date: '2030-01-06', // a Sunday far in the future — no seed collisions
      startTime: '10:00',
      endTime: '11:30',
      noConfirmationWarnMinutesBefore: 120,
      createdBy: commanderNoam.id
    })
    const draft = await scheduleService.getDraft(TRAINING_INTEL_ID)
    expect(draft?.events.some((e) => e.id === event.id)).toBe(true)
    const details = await lecturerService.getLectureDetails(event.id)
    expect(details?.confirmationStatus).toBe('NOT_SENT')
    expect(details?.confirmationToken).toBeTruthy()
  })

  it('confirmation by token notifies the commander', async () => {
    const details = db.get().guestLectureDetails[0]
    const result = await lecturerService.confirmLectureByToken(details.confirmationToken)
    expect(result.ok).toBe(true)
    const updated = await lecturerService.getLectureDetails(details.eventId)
    expect(updated?.confirmationStatus).toBe('CONFIRMED')
    const notifications = await notificationService.listNotificationsForUser(commanderNoam)
    expect(notifications.some((n) => n.kind === 'LECTURER_CONFIRMED')).toBe(true)
  })

  it('cancellation without a new date removes the lecture from the draft', async () => {
    const details = db.get().guestLectureDetails.find((d) => d.trainingId === TRAINING_INTEL_ID)!
    const draftBefore = await scheduleService.getDraft(TRAINING_INTEL_ID)
    const draftEvent = draftBefore!.events.find((e) => e.id === `${details.eventId}-d`)!
    const result = await lecturerService.cancelOrRescheduleLecture({
      trainingId: TRAINING_INTEL_ID,
      eventId: draftEvent.id
    })
    expect(result.ok).toBe(true)
    const draftAfter = await scheduleService.getDraft(TRAINING_INTEL_ID)
    expect(draftAfter?.events.some((e) => e.id === draftEvent.id)).toBe(false)
    const updated = await lecturerService.getLectureDetails(details.eventId)
    expect(updated?.confirmationStatus).toBe('CANCELLED')
  })
})

describe('shared events approval flow', () => {
  it('seeded pending change waits for the second commander', async () => {
    const requests = await sharedEventService.listChangeRequests()
    const pending = requests.find((r) => r.status === 'PENDING')!
    expect(pending.approvals.some((a) => a.status === 'PENDING')).toBe(true)
  })

  it('approval by all commanders applies the change to linked drafts', async () => {
    const request = (await sharedEventService.listChangeRequests()).find(
      (r) => r.status === 'PENDING'
    )!
    const updated = await sharedEventService.decideOnChange(
      request.id,
      TRAINING_INTEL_ID,
      'APPROVED'
    )
    expect(updated?.status).toBe('APPROVED')

    const intelDraft = await scheduleService.getDraft(TRAINING_INTEL_ID)
    const opsDraft = await scheduleService.getDraft(TRAINING_OPS_ID)
    const intelShared = intelDraft!.events.find((e) => e.sharedGroupId)
    const opsShared = opsDraft!.events.find((e) => e.sharedGroupId)
    expect(intelShared?.startTime).toBe(request.newStartTime)
    expect(opsShared?.startTime).toBe(request.newStartTime)
  })

  it('rejection marks the change as stuck and exposes contacts', async () => {
    const request = (await sharedEventService.listChangeRequests()).find(
      (r) => r.status === 'PENDING'
    )!
    const updated = await sharedEventService.decideOnChange(
      request.id,
      TRAINING_INTEL_ID,
      'REJECTED'
    )
    expect(updated?.status).toBe('STUCK')
    const contacts = await sharedEventService.pendingContacts(request.id)
    expect(contacts.length).toBeGreaterThan(0)
    expect(contacts[0].name).toBe(commanderNoam.displayName)
  })

  it('creating a linked shared event requires approval and inserts into both drafts', async () => {
    const group = await sharedEventService.createSharedEvent({
      title: 'הרצאה משותפת חדשה',
      date: '2030-01-07',
      startTime: '09:00',
      endTime: '10:00',
      createdByUserId: commanderShira.id,
      createdByTrainingId: TRAINING_OPS_ID,
      linkedTrainingIds: [TRAINING_OPS_ID, TRAINING_INTEL_ID]
    })
    expect(group.status).toBe('PENDING_LINK_APPROVAL')
    const intelDraft = await scheduleService.getDraft(TRAINING_INTEL_ID)
    expect(intelDraft?.events.some((e) => e.sharedGroupId === group.id)).toBe(true)

    const after = await sharedEventService.approveLink(group.id, TRAINING_INTEL_ID)
    expect(after?.status).toBe('ACTIVE')
  })
})

describe('version revert safety', () => {
  it('blocks revert when shared events differ', async () => {
    const training = (await trainingService.getTrainingById(TRAINING_INTEL_ID))!
    const prevId = training.previousPublishedScheduleIds[0]
    // prev1 seed has no shared events while current published does — unsafe.
    const result = await scheduleService.revertToVersion(
      TRAINING_INTEL_ID,
      prevId,
      commanderNoam.id
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('unsafe-shared-change')
  })
})
