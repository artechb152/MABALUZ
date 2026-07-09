// Schedule-feature strings not covered by the central dictionary.
export const newEventCopy = {
  editTitle: 'עריכת רכיב לו״ז',
  titleRequired: 'יש להזין כותרת לרכיב.',
  endAfterStart: 'שעת הסיום חייבת להיות אחרי שעת ההתחלה.',
  flexibilityForcedByType: 'רמת הגמישות נקבעת אוטומטית לפי סוג הרכיב.',
  equipmentHint: 'ניתן להזין מספר פריטים מופרדים בפסיק.',
  visibleToSoldiers: 'גלוי לחיילים',
  basicDetailsOnly: 'הצג פרטים בסיסיים בלבד',
  lockEvent: 'רכיב נעול',
  lockReasonPlaceholder: 'סיבת הנעילה',
  defaultColor: 'צבע ברירת מחדל',
  confirmDelete: 'למחוק את הרכיב?'
} as const

export const builderCopy = {
  unpublishedChanges: 'שינויים שלא פורסמו',
  noDivergence: 'הטיוטה זהה ללו״ז שפורסם',
  conflictsFound: (n: number) => `${n} קונפליקטים פתוחים בטיוטה`,
  goToConflicts: 'למרכז הקונפליקטים',
  discardConfirm: 'לבטל את כל השינויים שלא פורסמו? הטיוטה תשוחזר מהלו״ז שפורסם.',
  dropBlockedByHard: 'לא ניתן להזיז לכאן — התנגשות עם רכיב קשיח:',
  swapNoticeTitle: 'שימו לב — הוחלפו רכיבים במשך שונה',
  swapDurationChange: (title: string, oldMin: number, newMin: number) =>
    `"${title}" קיבל ${newMin} דק׳ במקום ${oldMin} דק׳`,
  weekOf: 'שבוע',
  publishedView: 'תצוגת הלו״ז שפורסם — לקריאה בלבד.',
  noTraining: 'לא נבחרה הכשרה.'
} as const

export const generateCopy = {
  title: 'הפקת לו״ז',
  intro: 'המערכת תשבץ את התכנים הגמישים סביב הרכיבים הקשיחים, על בסיס ההגדרות והלמידה ממחזורים קודמים.',
  running: 'מפיק לו״ז...',
  resultTitle: 'תוצאת ההפקה',
  eventsPlaced: 'רכיבים שובצו',
  conflictsCount: 'קונפליקטים',
  impossibleTitle: 'רכיבים שלא שובצו',
  suggestionsTitle: 'הצעות לפתרון',
  warningsTitle: 'אזהרות',
  apply: 'החל על הטיוטה',
  applied: 'הלו״ז הוחל על הטיוטה. ניתן לערוך ולפרסם.',
  usingTemplate: 'משתמש בתבנית שנלמדה מייבוא אקסל',
  noTemplate: 'אין תבנית מיובאת — ישובצו רכיבים קיימים וזמן שמור ברירת מחדל.'
} as const

export const publishCopy = {
  title: 'פרסום לו״ז',
  step1: 'בדיקת קונפליקטים',
  step2: 'דוח השפעות שינוי',
  step3: 'אישור ופרסום',
  overrideLabel: 'אישור חריג של המפקד — פרסום למרות קונפליקטים פתוחים',
  changeSummaryLabel: 'סיכום שינויים (יוצג לחיילים ובהיסטוריית הגרסאות)',
  commanderNoteLabel: 'הערת מפקד (תוצג לחיילים)',
  publishSuccess: 'הלו״ז פורסם בהצלחה. החיילים יקבלו עדכון.',
  noBlocking: 'אין קונפליקטים חוסמים. אפשר להמשיך.',
  warningsInfo: 'קיימות אזהרות שאינן חוסמות פרסום:',
  soldierPreviewHint: 'מומלץ לבדוק את תצוגת החייל לפני פרסום.'
} as const

export const soldierCopy = {
  nextWeekBlocked: 'הלו״ז לשבוע הבא יפורסם בהמשך.',
  commanderNote: 'הערת המפקד',
  attendanceSoon: 'סימון נוכחות (בקרוב)',
  noPublished: 'עדיין לא פורסם לו״ז להכשרה.',
  detailsTitle: 'פרטי רכיב',
  sharedWith: 'רכיב משותף עם'
} as const

export const monthCopy = {
  disabled: 'התצוגה החודשית כבויה בהגדרות ההכשרה.',
  more: (n: number) => `ועוד ${n}`
} as const

export const displayCopy = {
  back: 'חזרה',
  publishedOnly: 'מציג את הלו״ז שפורסם'
} as const
