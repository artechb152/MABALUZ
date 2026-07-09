import type { UserRole } from './user'

export type EmailKind = 'LECTURE_REMINDER' | 'LECTURE_THANK_YOU' | 'OTHER'

export interface SendEmailInput {
  to: string
  subject: string
  body: string
  kind: EmailKind
  eventId?: string
  trainingId?: string
  confirmationToken?: string
}

export interface SendEmailResult {
  ok: boolean
  messageId?: string
  error?: string
}

// Provider seam: MockEmailProvider now, OutlookEmailProvider later (behind
// the enableOutlookIntegration toggle).
export interface EmailProvider {
  readonly name: string
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>
}

export type MessageStatus = 'SENT' | 'FAILED' | 'PENDING'

export interface MessageLogEntry {
  id: string
  recipient: string
  subject: string
  bodyPreview: string
  body: string
  kind: EmailKind
  eventId?: string
  trainingId?: string
  sentAt: string
  status: MessageStatus
  provider: string
  error?: string
  confirmationToken?: string
}

export type NotificationKind =
  | 'SCHEDULE_PUBLISHED'
  | 'LECTURER_CONFIRMED'
  | 'NO_CONFIRMATION_WARNING'
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_DECIDED'
  | 'GENERAL'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body?: string
  userId?: string // targeted user, or:
  role?: UserRole // broadcast to a role within the training
  trainingId?: string
  createdAt: string
  readAt?: string
}
