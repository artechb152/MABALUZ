export const dashCopy = {
  // Time-of-day greeting (all role dashboards).
  hello: (name: string) => {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'בוקר טוב' : hour < 18 ? 'צהריים טובים' : 'ערב טוב'
    return `${greeting}, ${name}`
  },
  fullScheduleShort: 'ללו״ז המלא',
  todayInSchedule: 'היום בלו״ז',
  rightNow: 'עכשיו',
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
  fullDay: 'יום מלא',
  // Commander dashboard
  todaySchedule: 'לו״ז היום',
  closestLectures: 'הרצאות חוץ קרובות',
  commanderRequests: 'בקשות לטיפול',
  noRequests: 'אין בקשות שממתינות לך כרגע.',
  openConflictsTitle: 'קונפליקטים פתוחים בטיוטה',
  noOpenConflicts: 'אין קונפליקטים פתוחים בטיוטה.',
  draftStatusTitle: 'מצב הטיוטה',
  upcomingPeakDays: 'ימי שיא קרובים',
  noPeakDays: 'אין ימי שיא קרובים השבוע.',
  draftPublished: 'מפורסם ומעודכן',
  toShared: 'למרכז הלו״זים המשותפים',
  toConflicts: 'למרכז הקונפליקטים',
  toPublish: 'למעבר לפרסום'
} as const
