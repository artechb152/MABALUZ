export const mcCopy = {
  upcomingConfirmations: 'סטטוס אישורי הגעה — הרצאות קרובות',
  runSummary: (reminders: number, thanks: number, warns: number) =>
    `הבדיקה הושלמה: ${reminders} תזכורות נשלחו, ${thanks} מיילי תודה נשלחו, ${warns} התראות למפקדים.`,
  logTitle: 'יומן הודעות',
  recipient: 'נמען',
  subject: 'נושא',
  kind: 'סוג',
  sentAt: 'נשלח בתאריך',
  status: 'סטטוס',
  sent: 'נשלח',
  failed: 'נכשל',
  pending: 'ממתין',
  other: 'אחר'
} as const
