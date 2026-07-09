import type { GuestLectureDetails, ScheduleEvent } from '@/types'
import { db } from '@/app/dbStore'
import { formatDateHe } from '@/lib/time'
import { updateLectureDetails } from '@/data/services/lecturerService'
import { addNotification } from '@/data/services/notificationService'
import { warnings } from '@/lib/hebrewCopy'
import { buildReminderEmail, buildThankYouEmail } from './emailTemplates'
import { getActiveProvider } from './providers'

export interface SchedulerRunResult {
  remindersSent: number
  thankYousSent: number
  warningsRaised: number
}

const REMINDER_HOURS_BEFORE = 24

function findLectureEvent(details: GuestLectureDetails): ScheduleEvent | null {
  const all = db.get().schedules.flatMap((s) => s.events)
  return all.find((e) => e.id === details.eventId) ?? all.find((e) => e.id === `${details.eventId}-d`) ?? null
}

function eventStart(event: ScheduleEvent): Date {
  return new Date(`${event.date}T${event.startTime}:00`)
}

function eventEnd(event: ScheduleEvent): Date {
  return new Date(`${event.date}T${event.endTime}:00`)
}

/**
 * The background bot pass. Runs the three checks over every known guest
 * lecture: 24h reminder, post-lecture thank-you, and the "no confirmation"
 * warning to the commander. Idempotent — safe to run repeatedly.
 */
export async function runReminderScheduler(now: Date = new Date()): Promise<SchedulerRunResult> {
  const result: SchedulerRunResult = { remindersSent: 0, thankYousSent: 0, warningsRaised: 0 }
  const state = db.get()
  const provider = getActiveProvider(state.toggles)

  for (const details of state.guestLectureDetails) {
    if (details.confirmationStatus === 'CANCELLED') continue
    const event = findLectureEvent(details)
    if (!event) continue
    const lecturer = state.lecturers.find((l) => l.id === details.lecturerId)
    const training = state.trainings.find((t) => t.id === details.trainingId)
    const commander = state.users.find((u) => u.id === training?.commanderId)
    if (!lecturer || !training) continue

    const start = eventStart(event)
    const end = eventEnd(event)
    const msUntilStart = start.getTime() - now.getTime()

    // 1. Reminder: 24 hours before, once.
    if (
      details.confirmationStatus === 'NOT_SENT' &&
      msUntilStart > 0 &&
      msUntilStart <= REMINDER_HOURS_BEFORE * 60 * 60 * 1000
    ) {
      const email = buildReminderEmail({
        lecturerName: lecturer.fullName,
        trainingName: training.name,
        lectureTitle: event.title,
        date: formatDateHe(event.date),
        time: event.startTime,
        location: event.location ?? training.settings.baseLocation,
        contactName: commander?.displayName ?? '',
        contactPhone: commander?.phone ?? '',
        confirmationToken: details.confirmationToken
      })
      const sent = await provider.sendEmail({
        to: lecturer.email,
        subject: email.subject,
        body: email.body,
        kind: 'LECTURE_REMINDER',
        eventId: details.eventId,
        trainingId: training.id,
        confirmationToken: details.confirmationToken
      })
      if (sent.ok) {
        updateLectureDetails(details.eventId, {
          confirmationStatus: 'REMINDER_SENT',
          reminderSentAt: now.toISOString()
        })
        result.remindersSent += 1
      }
    }

    // 2. Thank-you: after the lecture ended, once.
    if (!details.thankYouSentAt && end.getTime() < now.getTime()) {
      const email = buildThankYouEmail({
        lecturerName: lecturer.fullName,
        trainingName: training.name,
        lectureTitle: event.title
      })
      const sent = await provider.sendEmail({
        to: lecturer.email,
        subject: email.subject,
        body: email.body,
        kind: 'LECTURE_THANK_YOU',
        eventId: details.eventId,
        trainingId: training.id
      })
      if (sent.ok) {
        updateLectureDetails(details.eventId, { thankYouSentAt: now.toISOString() })
        result.thankYousSent += 1
      }
    }

    // 3. No-confirmation warning to the commander, once per lecture.
    if (
      details.confirmationStatus === 'REMINDER_SENT' &&
      msUntilStart > 0 &&
      msUntilStart <= details.noConfirmationWarnMinutesBefore * 60 * 1000 &&
      commander
    ) {
      const alreadyWarned = db
        .get()
        .notifications.some(
          (n) => n.kind === 'NO_CONFIRMATION_WARNING' && n.userId === commander.id && n.body === event.title
        )
      if (!alreadyWarned) {
        await addNotification({
          kind: 'NO_CONFIRMATION_WARNING',
          title: warnings.noLecturerConfirmation.split('\n')[0],
          body: event.title,
          userId: commander.id,
          trainingId: training.id
        })
        result.warningsRaised += 1
      }
    }
  }

  return result
}
