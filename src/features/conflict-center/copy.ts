export const conflictCopy = {
  summary: (blocking: number, warning: number, info: number) =>
    `${blocking} חוסמים | ${warning} אזהרות | ${info} מידע`,
  involvedEvents: 'רכיבים מעורבים',
  applied: (title: string, date: string, time: string) => `"${title}" הוזז ל-${date} בשעה ${time}.`,
  applyFailed: 'לא נמצא חלון פנוי — נדרש שיבוץ ידני.',
  removeConfirm: (title: string) => `להסיר את "${title}" מהטיוטה?`,
  availableInBuilder: 'זמין דרך בניית הלו״ז.',
  openBuilder: 'לבניית הלו״ז'
} as const

export const versionsCopy = {
  eventsCount: (n: number) => `${n} רכיבים`,
  revertConfirm: 'שחזור יפרסם גרסה חדשה עם תוכן הגרסה שנבחרה. להמשיך?',
  reverted: 'הגרסה שוחזרה ופורסמה.',
  discardDraftConfirm: 'לבטל את שינויי הטיוטה ולשחזר מהלו״ז שפורסם?',
  compareHint: 'בחרו שתי גרסאות להשוואה.',
  compareTitle: 'השוואת גרסאות',
  selectForCompare: 'בחר להשוואה',
  selectedForCompare: 'נבחר להשוואה',
  unsafeRevert: 'שחזור חסום — הגרסה כוללת שינוי בלו״ז משותף.'
} as const
