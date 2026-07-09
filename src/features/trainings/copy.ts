export const trainingsCopy = {
  soldiers: (n: number, pending: number) =>
    pending > 0 ? `${n} חיילים (+${pending} ממתינים לשיוך)` : `${n} חיילים`,
  hasPublished: 'לו״ז פורסם',
  noPublished: 'טרם פורסם לו״ז',
  presetDisabled: 'תבנית לא פעילה',
  noPreset: 'ללא תבנית',
  presetLabel: 'תבנית קורס',
  hardEventsTitle: 'רכיבים קשיחים ידועים מראש',
  addHardEvent: 'הוסף רכיב קשיח',
  hardEventTypeLabel: 'סוג',
  removeRow: 'הסר',
  importLaterNote: 'ניתן לייבא לו״זים קודמים גם לאחר יצירת ההכשרה, דרך מסך ייבוא מאקסל.',
  summaryTitle: 'סיכום',
  createWithoutGenerate: 'צור ללא הפקת לו״ז',
  createAndGenerate: 'צור והפק לו״ז',
  created: 'ההכשרה נוצרה.',
  generated: (events: number, conflicts: number, impossible: number) =>
    `הלו״ז הופק: ${events} רכיבים שובצו, ${conflicts} קונפליקטים, ${impossible} רכיבים ללא שיבוץ.`,
  goToBuilder: 'מעבר לבניית הלו״ז',
  backToList: 'לרשימת ההכשרות',
  endBeforeStart: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה.',
  requiredFields: 'יש למלא את שדות החובה.',
  existingSoldiers: 'חיילים רשומים במערכת',
  pendingList: 'חיילים שיתווספו לפי מספר אישי'
} as const
