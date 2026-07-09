export const importCopy = {
  chooseFile: 'בחירת קובץ',
  parseError: 'שגיאה בניתוח הקובץ.',
  blocksFound: (n: number) => `${n} רכיבים זוהו`,
  warningsCount: (n: number) => `${n} אזהרות`,
  clearAll: 'נקה הכול',
  saveTemplate: 'שמור תבנית להכשרה',
  savedNote: 'התבנית נשמרה.',
  goGenerate: 'להפקת לו״ז',
  avgGuestMinutes: (n: number) => `זמן הרצאות חוץ ממוצע למחזור: ${n} דקות`,
  lunchAt: (t: string) => `צהריים בדרך כלל ב-${t}`,
  dinnerAt: (t: string) => `ערב בדרך כלל ב-${t}`,
  typeColumn: 'סוג מוצע',
  flexColumn: 'רמת גמישות',
  daysColumn: 'ימים אופייניים',
  reserveOn: 'מסומן כזמן שמור',
  oneOffOn: 'מסומן כחד-פעמי'
} as const
