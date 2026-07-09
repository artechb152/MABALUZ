// Hebrew email templates for the mock message-center bot. Friendly-formal
// tone, exact copy from the product spec. Sender: MABALUZ — מוקד הודעות.

export interface ReminderEmailInput {
  lecturerName: string
  trainingName: string
  lectureTitle: string
  date: string // dd/MM/yyyy
  time: string // HH:mm
  location: string
  contactName: string
  contactPhone: string
  confirmationToken: string
}

export const CONFIRM_BUTTON_LABEL = 'מאשר/ת הגעה'

export function confirmationLink(token: string): string {
  return `#/lecturer-confirmation/${token}`
}

export function buildReminderEmail(input: ReminderEmailInput): { subject: string; body: string } {
  const subject = `תזכורת להרצאה: ${input.lectureTitle} — ${input.date} בשעה ${input.time}`
  const body = `שלום ${input.lecturerName},

זוהי תזכורת ידידותית להרצאה המתוכננת שלך במסגרת ${input.trainingName}.

פרטי ההרצאה:
נושא: ${input.lectureTitle}
תאריך: ${input.date}
שעה: ${input.time}
מיקום: ${input.location}
איש קשר: ${input.contactName} — ${input.contactPhone}

נשמח לאישור הגעה בלחיצה על הכפתור:
[${CONFIRM_BUTTON_LABEL}] ${confirmationLink(input.confirmationToken)}

תודה רבה,
MABALUZ — מוקד הודעות`
  return { subject, body }
}

export interface ThankYouEmailInput {
  lecturerName: string
  trainingName: string
  lectureTitle: string
}

export function buildThankYouEmail(input: ThankYouEmailInput): { subject: string; body: string } {
  const subject = `תודה על ההרצאה — ${input.lectureTitle}`
  const body = `שלום ${input.lecturerName},

תודה רבה על ההרצאה שהעברת במסגרת ${input.trainingName}.
אנו מעריכים את הזמן, ההשקעה והתרומה שלך להכשרה.

בברכה,
MABALUZ — מוקד הודעות`
  return { subject, body }
}
