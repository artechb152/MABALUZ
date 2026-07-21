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
  handleRequests: 'מעבר לאישור',
  reviewRequest: 'בדיקה ואישור',
  allRequests: 'כל הבקשות',
  morePending: (n: number) => `ועוד ${n} בקשות נוספות`,
  openConflictsTitle: 'קונפליקטים פתוחים בטיוטה',
  noOpenConflicts: 'אין קונפליקטים פתוחים בטיוטה.',
  draftStatusTitle: 'מצב הטיוטה',
  draftPublished: 'מפורסם ומעודכן',
  draftBlocked: 'קיימות התנגשויות שלא נפתרו',
  viewChanges: 'צפייה בשינויים',
  resolveConflicts: 'מעבר לפתרון',
  // Card explanations (info tooltip)
  infoToday: 'הלו״ז שפורסם להיום — בדיוק מה שהחיילים רואים כרגע.',
  infoRequests: 'בקשות לשינוי בלו״זים משותפים שממתינות לאישורך. אישור או דחייה יעדכנו את ההכשרות המשותפות.',
  infoConflicts: 'התנגשויות בטיוטת הלו״ז שכדאי לפתור לפני פרסום. מימין ההתנגשויות, משמאל מצב הפרסום של הטיוטה.',
  infoLectures: 'הרצאות החוץ הקרובות השבוע ומצב אישור ההגעה של המרצה.',
  conflictsBlocking: 'חוסמים',
  conflictsWarning: 'אזהרות',
  conflictsInfo: 'מידע'
} as const
