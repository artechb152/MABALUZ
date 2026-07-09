export interface GuestLecturer {
  id: string
  fullName: string
  role: string
  organization?: string
  email: string
  phone: string
  lectureTypes: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export type LectureConfirmationStatus =
  | 'NOT_SENT'
  | 'REMINDER_SENT'
  | 'CONFIRMED'
  | 'NO_RESPONSE'
  | 'CANCELLED'

// Lecture-specific operational data lives alongside the ScheduleEvent (which
// stays a pure calendar block). Keyed by eventId.
export interface GuestLectureDetails {
  eventId: string
  trainingId: string
  lecturerId: string
  confirmationStatus: LectureConfirmationStatus
  confirmationToken: string
  maxDurationMinutes?: number
  // When to warn if no confirmation arrived: 60 / 120 / 180 / custom minutes.
  noConfirmationWarnMinutesBefore: number
  reminderSentAt?: string
  confirmedAt?: string
  thankYouSentAt?: string
  cancelledAt?: string
}
