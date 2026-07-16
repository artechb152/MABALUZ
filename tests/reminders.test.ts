import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/app/dbStore'
import { TRAINING_INTEL_ID } from '@/data/mock/trainings'
import { mockUsers } from '@/data/mock/users'
import * as lecturerService from '@/data/services/lecturerService'
import * as notificationService from '@/data/services/notificationService'
import { runReminderScheduler } from '@/features/message-center/reminderScheduler'
import { addDaysISO, todayISO } from '@/lib/time'

const commander = mockUsers.find((u) => u.id === 'user-commander-noam')!

// Deterministic "now" 4h before the tomorrow-10:00 lecture — inside the 24h
// reminder window regardless of the wall clock (the scheduler takes `now`).
const reminderNow = () => new Date(`${addDaysISO(todayISO(), 1)}T06:00:00`)

beforeEach(() => {
  db.reset()
})

async function addLectureTomorrowAt10(): Promise<string> {
  const lecturer = db.get().lecturers[0]
  const event = await lecturerService.addGuestLecture({
    trainingId: TRAINING_INTEL_ID,
    lecturerId: lecturer.id,
    title: 'הרצאת חוץ: בדיקת תזכורות',
    date: addDaysISO(todayISO(), 1),
    startTime: '10:00',
    endTime: '11:30',
    noConfirmationWarnMinutesBefore: 120,
    createdBy: commander.id
  })
  return event.id
}

describe('mock reminder bot (24h before lecture)', () => {
  it('logs a Hebrew reminder email with the confirmation link and updates status', async () => {
    const eventId = await addLectureTomorrowAt10()
    const result = await runReminderScheduler(reminderNow())
    expect(result.remindersSent).toBeGreaterThanOrEqual(1)

    const log = db.get().messages.find((m) => m.eventId === eventId)
    expect(log).toBeDefined()
    expect(log!.provider).toBe('mock')
    expect(log!.status).toBe('SENT')
    expect(log!.subject).toContain('תזכורת להרצאה')
    expect(log!.subject).toContain('הרצאת חוץ: בדיקת תזכורות')
    expect(log!.body).toContain('שלום')
    expect(log!.body).toContain(db.get().lecturers[0].fullName)
    expect(log!.body).toContain('מאשר/ת הגעה')
    expect(log!.body).toContain('MABALUZ — מוקד הודעות')
    expect(log!.body).toContain(log!.confirmationToken!)

    const details = await lecturerService.getLectureDetails(eventId)
    expect(details?.confirmationStatus).toBe('REMINDER_SENT')
    expect(details?.reminderSentAt).toBeTruthy()
  })

  it('does not send the same reminder twice', async () => {
    const eventId = await addLectureTomorrowAt10()
    await runReminderScheduler(reminderNow())
    const second = await runReminderScheduler(reminderNow())
    expect(second.remindersSent).toBe(0)
    const logs = db.get().messages.filter((m) => m.eventId === eventId && m.kind === 'LECTURE_REMINDER')
    expect(logs).toHaveLength(1)
  })

  it('confirmation via the emailed token notifies the commander', async () => {
    const eventId = await addLectureTomorrowAt10()
    await runReminderScheduler()
    const details = (await lecturerService.getLectureDetails(eventId))!
    const result = await lecturerService.confirmLectureByToken(details.confirmationToken)
    expect(result.ok).toBe(true)

    const updated = await lecturerService.getLectureDetails(eventId)
    expect(updated?.confirmationStatus).toBe('CONFIRMED')

    const notifications = await notificationService.listNotificationsForUser(commander)
    expect(notifications.some((n) => n.kind === 'LECTURER_CONFIRMED')).toBe(true)
  })

  it('raises a no-confirmation warning close to the lecture', async () => {
    const lecturer = db.get().lecturers[0]
    // Lecture in one hour; warn threshold 120 minutes; reminder already sent.
    const now = new Date()
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
    const hh = String(inOneHour.getHours()).padStart(2, '0')
    const mm = String(Math.floor(inOneHour.getMinutes() / 15) * 15).padStart(2, '0')
    const event = await lecturerService.addGuestLecture({
      trainingId: TRAINING_INTEL_ID,
      lecturerId: lecturer.id,
      title: 'הרצאת חוץ: בדיקת התראה',
      date: `${inOneHour.getFullYear()}-${String(inOneHour.getMonth() + 1).padStart(2, '0')}-${String(inOneHour.getDate()).padStart(2, '0')}`,
      startTime: `${hh}:${mm}`,
      endTime: '23:45',
      noConfirmationWarnMinutesBefore: 120,
      createdBy: commander.id
    })
    lecturerService.updateLectureDetails(event.id, { confirmationStatus: 'REMINDER_SENT' })

    const result = await runReminderScheduler(now)
    expect(result.warningsRaised).toBeGreaterThanOrEqual(1)

    const notifications = await notificationService.listNotificationsForUser(commander)
    expect(notifications.some((n) => n.kind === 'NO_CONFIRMATION_WARNING')).toBe(true)
  })

  it('sends a thank-you email after the lecture has ended', async () => {
    const lecturer = db.get().lecturers[1]
    const yesterday = addDaysISO(todayISO(), -1)
    const event = await lecturerService.addGuestLecture({
      trainingId: TRAINING_INTEL_ID,
      lecturerId: lecturer.id,
      title: 'הרצאת חוץ: בדיקת תודה',
      date: yesterday,
      startTime: '10:00',
      endTime: '11:00',
      noConfirmationWarnMinutesBefore: 60,
      createdBy: commander.id
    })
    const result = await runReminderScheduler()
    expect(result.thankYousSent).toBeGreaterThanOrEqual(1)
    const log = db.get().messages.find((m) => m.eventId === event.id && m.kind === 'LECTURE_THANK_YOU')
    expect(log).toBeDefined()
    expect(log!.subject).toContain('תודה על ההרצאה')
    expect(log!.body).toContain(lecturer.fullName)
  })
})
