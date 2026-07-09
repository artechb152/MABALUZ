// ALL user-facing Hebrew strings live here. Components must not hardcode UI
// text. Code identifiers stay English; copy stays Hebrew. No emojis.
import type {
  UserRole,
  ScheduleEventType,
  FlexibilityLevel,
  ConflictSeverity,
  ApprovalStatus,
  ImportConfidence,
  TrainingStatus,
  LectureConfirmationStatus
} from '@/types'

export const app = {
  name: 'MABALUZ',
  tagline: 'מערכת חכמה לבניית לו״זי הכשרה',
  orgCredit: 'המערכת פותחה על ידי יחידת ARTECH במערך ההדרכה של חיל המודיעין — בה״ד 15.',
  defaultBase: 'בה״ד 15'
} as const

export const roleLabels: Record<UserRole, string> = {
  SOLDIER: 'חייל בהכשרה',
  TRAINING_COMMANDER: 'מפקד הכשרה',
  SENIOR_COMMANDER: 'מפקד בכיר',
  ADMIN: 'מנהל מערכת'
}

export const eventTypeLabels: Record<ScheduleEventType, string> = {
  SHARED: 'לו״ז משותף',
  PEAK_DAY: 'יום שיא',
  GUEST_LECTURE: 'הרצאת חוץ',
  FLEXIBLE_CONTENT: 'תוכן גמיש',
  MEAL_BREAK: 'ארוחה והפסקה',
  COMMANDER_TIME: 'זמן מפקד',
  FORMATION: 'מסדר',
  TEAM_ACTIVITY: 'פעילות צוותית',
  CUSTOM: 'רכיב מותאם אישית'
}

export const flexibilityLabels: Record<FlexibilityLevel, string> = {
  LOCKED_SHARED: 'קשיח — לו״ז משותף',
  LOCKED_PEAK_DAY: 'קשיח — יום שיא',
  LOCKED_GUEST_LECTURE: 'קשיח — הרצאת חוץ',
  SEMI_FLEXIBLE: 'גמיש חלקית',
  FLEXIBLE: 'גמיש'
}

export const trainingStatusLabels: Record<TrainingStatus, string> = {
  PLANNING: 'בתכנון',
  ACTIVE: 'פעילה',
  COMPLETED: 'הסתיימה',
  ARCHIVED: 'בארכיון'
}

export const conflictSeverityLabels: Record<ConflictSeverity, string> = {
  INFO: 'מידע',
  WARNING: 'אזהרה',
  BLOCKING: 'חוסם'
}

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  PENDING: 'ממתין לאישור',
  APPROVED: 'אושר',
  REJECTED: 'נדחה',
  EXPIRED: 'פג תוקף'
}

export const confidenceLabels: Record<ImportConfidence, string> = {
  HIGH: 'גבוהה',
  MEDIUM: 'בינונית',
  LOW: 'נמוכה'
}

export const confirmationStatusLabels: Record<LectureConfirmationStatus, string> = {
  NOT_SENT: 'טרם נשלחה תזכורת',
  REMINDER_SENT: 'תזכורת נשלחה',
  CONFIRMED: 'אישור הגעה התקבל',
  NO_RESPONSE: 'לא התקבל אישור הגעה',
  CANCELLED: 'ההרצאה בוטלה'
}

export const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const
export const dayNamesShort = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'] as const

export const nav = {
  dashboard: 'דשבורד',
  myTrainings: 'ההכשרות שלי',
  scheduleBuilder: 'בניית לו״ז',
  weeklySchedule: 'לו״ז שבועי',
  monthlySchedule: 'לו״ז חודשי',
  scheduleEvents: 'רכיבי לו״ז',
  sharedSchedules: 'לו״זים משותפים',
  peakDays: 'ימי שיא',
  guestLecturers: 'מרצי חוץ',
  excelImport: 'ייבוא מאקסל',
  conflictCenter: 'מרכז קונפליקטים',
  versions: 'טיוטות וגרסאות',
  messageCenter: 'מוקד הודעות',
  faq: 'שאלות נפוצות',
  contact: 'יצירת קשר',
  settings: 'הגדרות מערכת',
  userManagement: 'ניהול משתמשים',
  adminArea: 'אזור מנהל',
  mySchedule: 'הלו״ז שלי'
} as const

export const buttons = {
  createTraining: 'צור הכשרה חדשה',
  createSchedule: 'צור לו״ז חדש',
  addEvent: 'הוסף רכיב לו״ז',
  addShared: 'הוסף לו״ז משותף',
  addPeakDay: 'הוסף יום שיא',
  addGuestLecture: 'הוסף הרצאת חוץ',
  importExcel: 'ייבא קובץ אקסל',
  generateSchedule: 'הפק לו״ז',
  saveDraft: 'שמור כטיוטה',
  publish: 'פרסם לו״ז',
  discardChanges: 'בטל שינויים',
  lockDay: 'נעל יום',
  unlockDay: 'פתח נעילה',
  showImpact: 'הצג השפעות שינוי',
  approveChange: 'אשר שינוי',
  rejectChange: 'דחה שינוי',
  showContactDetails: 'הצג פרטי קשר',
  showSuggestions: 'הצג הצעות',
  applyRecommended: 'הפעל פתרון מומלץ',
  soldierPreview: 'עבור לתצוגת חייל',
  backToEditing: 'חזור לעריכה',
  save: 'שמירה',
  cancel: 'ביטול',
  close: 'סגירה',
  confirm: 'אישור',
  continueAnyway: 'המשך בכל זאת',
  delete: 'מחיקה',
  edit: 'עריכה',
  search: 'חיפוש',
  add: 'הוספה',
  next: 'הבא',
  previous: 'הקודם',
  finish: 'סיום',
  enter: 'כניסה',
  signIn: 'כניסה למערכת',
  signOut: 'התנתקות',
  switchUser: 'החלף משתמש',
  exportPdf: 'ייצוא ל-PDF',
  displayMode: 'מצב תצוגה',
  revert: 'שחזר גרסה',
  markLecturerCancelled: 'המרצה ביטל',
  sendReminderNow: 'שלח תזכורת עכשיו',
  runReminderScheduler: 'הפעל בדיקת תזכורות',
  openTraining: 'כניסה להכשרה',
  addSoldier: 'הוסף חייל',
  today: 'היום'
} as const

export const statusLabels = {
  draft: 'טיוטה',
  published: 'פורסם',
  notPublished: 'לא פורסם',
  pendingApproval: 'ממתין לאישור',
  approved: 'אושר',
  rejected: 'נדחה',
  hasConflict: 'קיים קונפליקט',
  unschedulable: 'בלתי ניתן לשיבוץ',
  recommended: 'מומלץ',
  locked: 'נעול',
  shared: 'משותף',
  visibleToSoldiers: 'גלוי לחיילים',
  hiddenFromSoldiers: 'מוסתר מחיילים',
  unsynced: 'לא מסונכרן',
  linked: 'מקושר',
  expired: 'פג תוקף',
  stuckChange: 'שינוי תקוע',
  fullDay: 'יום מלא',
  currentVersion: 'לו״ז נוכחי',
  previousVersion: 'גרסה קודמת',
  twoVersionsAgo: 'לפני 2 גרסאות'
} as const

export const warnings = {
  affectsOtherTrainings: 'שינוי זה משפיע על הכשרות נוספות.',
  cannotPublishWithConflicts: 'לא ניתן לפרסם את הלו״ז עד לפתרון הקונפליקטים או אישור חריג.',
  willMoveExistingEvents: 'פעולה זו תזיז רכיבים קיימים בלו״ז.',
  sharedChangeNeedsAllApprovals: 'שינוי בלו״ז משותף דורש אישור מכל המפקדים הרלוונטיים.',
  notEnoughTime: 'לא נמצא מספיק זמן לשיבוץ כל הרכיבים.',
  manualConfirmationRequired: 'ניתן להמשיך רק לאחר אישור ידני של המפקד.',
  draftOnlyUntilPublish: 'הפעולה תישמר כטיוטה ולא תוצג לחיילים עד לפרסום.',
  unresolvedConflictsOnPublish:
    'קיימים קונפליקטים שלא נפתרו.\nניתן לפרסם את הלו״ז רק לאחר אישור ידני של המפקד.',
  unsafeRollback:
    'שינוי זה קשור להכשרות נוספות ולכן לא ניתן לבטל אותו אוטומטית לאחר פרסום.\nכדי לחזור אחורה יש ליצור שינוי חדש ולאשר אותו מול כל המפקדים הרלוונטיים.',
  peakDayOverridesGuestLecture:
    'יום השיא שבחרת מתנגש עם הרצאת חוץ.\nאם תמשיך, יהיה עליך לשבץ מחדש את ההרצאה למועד אחר.',
  peakDayOverridesShared:
    'יום השיא שבחרת מתנגש עם לו״ז משותף.\nשינוי כזה עשוי להשפיע על הכשרות נוספות ודורש בדיקה ואישור.',
  sharedChangeBeforePublish:
    'שינוי בלו״ז משותף ישפיע על הכשרות נוספות.\nיש לוודא שכל המפקדים הרלוונטיים מאשרים את השינוי לפני פרסום.',
  sharedChangeOverridesEvent:
    'השינוי דורש דריסה של רכיב קיים בהכשרה אחרת.\nיש לבדוק את דוח ההשפעות ולאשר ידנית.',
  noLecturerConfirmation: 'לא התקבל אישור הגעה מהמרצה.\nמומלץ ליצור קשר טלפוני לווידוא הגעה.',
  lockedDay: 'יום זה נעול לשינויים.',
  offlineEnvironment:
    'המערכת פועלת בסביבה פנימית.\nייתכן שחלק מהעדכונים החיצוניים אינם זמינים ללא חיבור מתאים.'
} as const

export const emptyStates = {
  noSchedule: 'עדיין לא נבנה לו״ז להכשרה הזו.',
  noConflicts: 'אין קונפליקטים פתוחים כרגע.',
  noUpcomingLectures: 'אין הרצאות חוץ קרובות.',
  noSharedSchedules: 'לא נמצאו לו״זים משותפים.',
  importToStart: 'ייבא קובץ אקסל כדי להתחיל ללמוד ממחזורים קודמים.',
  noNotifications: 'אין הודעות חדשות.',
  noMessages: 'לא נשלחו הודעות עדיין.',
  noVersions: 'אין גרסאות קודמות.',
  noTrainings: 'אין הכשרות להצגה.',
  noPeakDays: 'לא הוגדרו ימי שיא.',
  noLecturers: 'לא נמצאו מרצים במאגר.',
  noResults: 'לא נמצאו תוצאות.'
} as const

export const aiPlaceholder = {
  title: 'ניתוח AI — בפיתוח',
  body: 'בעתיד המערכת תוכל לנתח טבלאות מורכבות בצורה חכמה יותר.\nבשלב זה הניתוח מבוסס על חוקים כדי לשמור על יציבות ודיוק.'
} as const

export const entry = {
  chooseUser: 'בחר משתמש לדוגמה',
  signInTitle: 'כניסה למערכת',
  devModeNote: 'מצב פיתוח — התחברות באמצעות בחירת משתמש לדוגמה, ללא סיסמה.',
  backToLogin: 'חזרה למסך ההתחברות'
} as const

export const login = {
  welcome: 'ברוכים הבאים',
  tabSignIn: 'התחברות',
  tabRegister: 'הרשמה',
  personalNumber: 'מספר אישי',
  password: 'סיסמה',
  confirmPassword: 'אימות סיסמה',
  fullName: 'שם מלא',
  status: 'סטטוס',
  statusOptions: ['חייל בהכשרה', 'מפקד הכשרה', 'מפקד בכיר'],
  statusDescriptions: ['צפייה בלו״ז שפורסם', 'בנייה וניהול של לו״ז ההכשרה', 'ניהול מספר הכשרות'],
  forgotPassword: 'שכחתי סיסמה',
  signInAction: 'התחברות',
  registerAction: 'יצירת חשבון',
  skipLogin: 'דלג על ההתחברות',
  passwordRule: 'לפחות 8 תווים, כולל ספרה ותו מיוחד.',
  forgotTitle: 'איפוס סיסמה',
  forgotBody: 'הזינו את המספר האישי ונשלח קישור לאיפוס סיסמה.',
  forgotSubmit: 'שלח קישור איפוס',
  forgotSent: 'אם המספר קיים במערכת, יישלח קישור לאיפוס. יש לפנות לתמיכה במידת הצורך.',
  backToSignIn: 'חזרה להתחברות',
  devNote: 'שלב פיתוח — הנתונים אינם נשמרים ואינם מתחברים לשרת. לחיצה על אישור תעביר לבחירת חשבון לדוגמה.',
  registered: 'הפרטים נקלטו (הדגמה בלבד). ממשיכים לבחירת חשבון לדוגמה.'
} as const

export const userMenu = {
  viewProfile: 'צפייה בפרופיל',
  swapAccount: 'החלפת חשבון',
  settings: 'הגדרות',
  signOut: 'התנתקות',
  profileTitle: 'הפרופיל שלי',
  personalSettingsTitle: 'הגדרות אישיות'
} as const

export const sharedEvents = {
  pendingAllApprovals: 'השינוי ממתין לאישור כל המפקדים הרלוונטיים.\nעד לקבלת כל האישורים, הלו״ז המשותף לא יעודכן.',
  stuck: 'השינוי לא אושר על ידי כל הצדדים.\nמומלץ ליצור קשר טלפוני עם המפקד הרלוונטי.',
  linkedTrainings: 'הכשרות מקושרות',
  createUnsynced: 'צור לו״ז משותף לא מסונכרן',
  linkLater: 'ניתן לקשר הכשרה נוספת בהמשך.',
  searchTraining: 'חיפוש הכשרה לפי שם או סימול',
  activeTrainingsInBase: 'הכשרות פעילות בבה״ד 15',
  pendingRequests: 'בקשות ממתינות',
  changeRequest: 'בקשת שינוי'
} as const

export const peakDays = {
  activityTypes: ['מטווחים', 'סיור', 'יום שטח', 'פעילות חוץ', 'תרגיל', 'יום גיבוש', 'אחר'],
  otherTypeLabel: 'אחר',
  customTypePlaceholder: 'תיאור סוג הפעילות',
  showToSoldiers: 'הצג לחיילים',
  hideDetails: 'הסתר פרטים מהחיילים',
  fullDayNote: 'יום שיא תופס יום מלא ומחליף את תוכן היום.'
} as const

export const lecturers = {
  reserveLabel: 'זמן שמור להרצאות חוץ',
  cancelledQuestion: 'האם המרצה נתן מועד חדש?',
  cancelledYes: 'כן, יש מועד חדש',
  cancelledNo: 'לא, אין מועד חדש כרגע',
  lecturerConfirmed: 'המרצה אישר הגעה להרצאה.',
  warnBeforeOptions: ['שעה לפני', 'שעתיים לפני', 'שלוש שעות לפני', 'מותאם אישית'],
  addNewLecturer: 'הוסף מרצה חדש',
  searchLecturer: 'חיפוש מרצה',
  lectureDatabase: 'מאגר מרצים',
  maxDuration: 'משך מרבי משוער'
} as const

export const messageCenter = {
  title: 'מוקד הודעות',
  senderName: 'MABALUZ — מוקד הודעות',
  reminderSent: 'תזכורת נשלחה',
  thankYouSent: 'מייל תודה נשלח',
  confirmationReceived: 'אישור הגעה התקבל',
  noConfirmation: 'לא התקבל אישור הגעה',
  providerStatus: 'סטטוס ספק הודעות',
  mockProvider: 'ספק מדומה (פיתוח)',
  outlookDisabled: 'חיבור Outlook — כבוי בשלב זה'
} as const

export const impact = {
  title: 'דוח השפעות שינוי',
  movedEvents: 'רכיבים שהוזזו',
  overwrittenEvents: 'רכיבים שנדרסו',
  affectedTrainings: 'הכשרות מושפעות',
  approvalsRequired: 'אישורים נדרשים',
  soldierVisibleChanges: 'שינויים שיוצגו לחיילים',
  recommendedAction: 'פעולה מומלצת',
  canUndo: 'ניתן לביטול',
  cannotUndo: 'לא ניתן לביטול אוטומטי'
} as const

export const conflictCenter = {
  title: 'מרכז קונפליקטים',
  hardConflict: 'קונפליקט קשיח',
  softConflict: 'קונפליקט גמיש',
  suggestions: 'הצעות לפתרון',
  recommended: 'מומלץ',
  anotherOption: 'אפשרות נוספת',
  requiresManualApproval: 'דורש אישור ידני',
  automaticResolution: 'פתרון אוטומטי',
  partialResolution: 'פתרון חלקי',
  manualResolve: 'שיבוץ ידני',
  shortenContent: 'קיצור תכנים',
  extendTraining: 'הארכת הכשרה',
  removeItem: 'הסרת רכיב'
} as const

export const importScreen = {
  title: 'סקירת ייבוא',
  detectedItems: 'רכיבים שזוהו',
  estimatedDuration: 'משך משוער',
  confidence: 'רמת ביטחון',
  includeInSchedule: 'כלול בלו״ז',
  ignoreItem: 'התעלם מהרכיב',
  editItem: 'ערוך רכיב',
  markAsReserve: 'סמן כזמן שמור להרצאות חוץ',
  markAsOneOff: 'סמן כחד-פעמי והתעלם',
  dropHere: 'גרור לכאן קובץ אקסל או לחץ לבחירה',
  useSample: 'טען קובץ לדוגמה',
  parse: 'נתח קובץ',
  parsing: 'מנתח...',
  occurrences: 'הופעות'
} as const

export const wizard = {
  steps: ['פרטי הכשרה', 'מפקדים וחיילים', 'הגדרות שעות', 'ייבוא לו״זים קודמים', 'רכיבים קשיחים', 'יצירת לו״ז'],
  fields: {
    name: 'שם הכשרה',
    symbol: 'סימול / קוד הכשרה',
    cycle: 'מחזור',
    startDate: 'תאריך התחלה',
    endDate: 'תאריך סיום',
    base: 'בסיס',
    unit: 'יחידה',
    commander: 'מפקד הכשרה',
    seniorCommander: 'מפקד בכיר',
    soldiers: 'רשימת חיילים'
  },
  addPendingSoldier: 'הוספת חייל לפי מספר אישי',
  pendingSoldierNote: 'חיילים שיירשמו בעתיד עם מספר אישי תואם ישויכו אוטומטית להכשרה.'
} as const

export const dashboards = {
  myTrainings: 'ההכשרות שלי',
  activeTrainings: 'הכשרות פעילות',
  pendingApprovals: 'ממתין לאישור',
  openConflicts: 'קונפליקטים פתוחים',
  upcomingLectures: 'הרצאות קרובות',
  startingSoon: 'הכשרות שמתחילות בקרוב',
  currentTraining: 'ההכשרה הנוכחית',
  draftStatus: 'מצב טיוטה',
  nextHardEvents: 'רכיבים קשיחים קרובים',
  quickActions: 'פעולות מהירות',
  mySchedule: 'הלו״ז שלי',
  myTraining: 'ההכשרה שלי',
  myCommander: 'מפקד ההכשרה',
  notifications: 'הודעות ועדכונים',
  commanderNotes: 'הערות המפקד',
  guestLecturesNext7Days: 'הרצאות חוץ בשבוע הקרוב',
  soldiers: 'חיילים',
  trainingDates: 'תאריכי ההכשרה'
} as const

export const versions = {
  title: 'טיוטות וגרסאות',
  versionNumber: 'מספר גרסה',
  publishedAt: 'תאריך פרסום',
  publishedBy: 'פורסם על ידי',
  commanderNote: 'הערת מפקד',
  changeSummary: 'סיכום שינויים',
  safeRevert: 'שחזור בטוח',
  compare: 'השוואה'
} as const

export const settingsCopy = {
  title: 'הגדרות מערכת',
  trainingHours: 'שעות פעילות',
  sundayToThursday: 'ראשון עד חמישי',
  friday: 'שישי',
  saturday: 'שבת (מוצאי שבת)',
  saturdayNote: 'שעת סיום השבת מוגדרת ידנית. אין חישוב אוטומטי בשלב זה.',
  lunchWindow: 'חלון ארוחת צהריים',
  dinnerWindow: 'חלון ארוחת ערב',
  mealNote: 'ארוחה והפסקה הן רכיב אחד של 60 דקות.',
  allowMonthView: 'אפשר תצוגה חודשית',
  allowSoldiersNextWeek: 'אפשר לחיילים לראות את השבוע הבא',
  featureToggles: 'הגדרות תכונות',
  supportContact: 'טלפון תמיכה',
  supportContactMissing: 'לא הוגדר טלפון תמיכה. יש להגדיר את VITE_SUPPORT_PHONE בקובץ הסביבה.'
} as const

export const contact = {
  title: 'יצירת קשר',
  body: 'לתמיכה, שאלות או בקשות פיתוח ניתן לפנות בווצאפ למספר המוגדר במערכת.',
  whatsappLabel: 'ווצאפ לתמיכה'
} as const

export const approvals = {
  seniorPendingWithPhone: (phone: string) =>
    `בקשת ההרשאה שלך ממתינה לאישור.\nניתן לפנות בווצאפ למספר: ${phone} לקבלת אישור.`,
  trainingCommanderPending:
    'בקשת ההרשאה שלך ממתינה לאישור המפקד הבכיר.\nיש לפנות למפקד האחראי על ההכשרה לקבלת אישור.'
} as const

export const presets = {
  commandCourseTitle: 'תבנית שמורה לקורס פיקוד והדרכה',
  commandCourseBody: 'התבנית תופעל לאחר שיוזנו נתוני הקורס בפועל.'
} as const

export const exportCopy = {
  pdf: 'ייצוא ל-PDF',
  displayMode: 'מצב תצוגה',
  projectionView: 'תצוגה להקרנה',
  pdfComingSoon: 'ייצוא PDF מלא יתווסף בהמשך. בשלב זה ניתן להדפיס את התצוגה.'
} as const

export const generic = {
  loading: 'טוען...',
  date: 'תאריך',
  day: 'יום',
  time: 'שעה',
  startTime: 'שעת התחלה',
  endTime: 'שעת סיום',
  duration: 'משך',
  minutes: 'דקות',
  hours: 'שעות',
  location: 'מיקום',
  instructor: 'מדריך / מרצה',
  equipment: 'ציוד נדרש',
  notes: 'הערות',
  commanderNotes: 'הערות מפקד',
  soldierNotes: 'הערות לחיילים',
  title: 'כותרת',
  shortDescription: 'תיאור קצר',
  description: 'תיאור',
  type: 'סוג רכיב',
  flexibility: 'רמת גמישות',
  visibility: 'נראות',
  color: 'צבע',
  status: 'סטטוס',
  actions: 'פעולות',
  name: 'שם',
  phone: 'טלפון',
  email: 'דוא״ל',
  role: 'תפקיד',
  organization: 'ארגון',
  personalNumber: 'מספר אישי',
  week: 'שבוע',
  legend: 'מקרא',
  all: 'הכול',
  yes: 'כן',
  no: 'לא',
  optional: 'אופציונלי',
  required: 'שדה חובה',
  underConstruction: 'העמוד בבנייה ויהיה זמין בקרוב.',
  markAllRead: 'סמן הכול כנקרא'
} as const
