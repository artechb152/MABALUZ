export const dashCopy = {
  // Time-of-day greeting (all role dashboards).
  hello: (name: string) => {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב'
    return `${greeting}, ${name}`
  },
  fullScheduleShort: 'ללו״ז המלא',
  todayInSchedule: 'היום בלו״ז',
  nothingToday: 'אין רכיבים להיום.',
  draftDiverged: 'קיימים שינויים שטרם פורסמו',
  draftSynced: 'הטיוטה זהה ללו״ז שפורסם',
  pendingMyApproval: 'ממתין לאישורך',
  noHardEvents: 'אין רכיבים קשיחים קרובים.',
  viewFullSchedule: 'לצפייה בלו״ז המלא',
  enterTraining: 'כניסה להכשרה',
  soldiersCount: 'חיילים',
  nextGuestLecture: 'הרצאת חוץ קרובה',
  noCommanderNote: 'אין הערות מהמפקד כרגע.',
  systemStatus: 'מצב המערכת',
  totalUsers: 'משתמשים במערכת',
  totalTrainings: 'הכשרות במערכת',
  messagesSent: 'הודעות שנשלחו',
  adminQuickLinks: 'קיצורי ניהול',
  fullDay: 'יום מלא'
} as const
