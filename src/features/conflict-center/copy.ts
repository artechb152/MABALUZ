export const conflictCopy = {
  summary: (blocking: number, warning: number, info: number) =>
    `${blocking} חוסמים | ${warning} אזהרות | ${info} מידע`,
  involvedEvents: 'רכיבים מעורבים',
  applied: (title: string, date: string, time: string) => `"${title}" הוזז ל-${date} בשעה ${time}.`,
  applyFailed: 'לא נמצא חלון פנוי — נדרש שיבוץ ידני.',
  removeConfirm: (title: string) => `להסיר את "${title}" מהטיוטה?`,
  availableInBuilder: 'זמין דרך בניית הלו״ז.',
  openBuilder: 'לבניית הלו״ז',
  // First-visit explainer popup.
  helpTitle: 'איך לקרוא את מרכז הקונפליקטים',
  helpIntro: 'המסך מרכז את ההתנגשויות בטיוטת הלו״ז ומדרג אותן לפי חומרה:',
  helpBlockingTitle: 'חוסם',
  helpBlocking:
    'התנגשות בין שני רכיבים קשיחים — למשל לו״ז משותף, יום שיא או הרצאת חוץ. חוסם מונע פרסום עד שהוא נפתר.',
  helpWarningTitle: 'אזהרה',
  helpWarning:
    'רכיב גמיש שחופף לרכיב קשיח, או חריגה משעות הפעילות. ניתן לפרסם, אך מומלץ לטפל לפני הפרסום.',
  helpInfoTitle: 'מידע',
  helpInfo: 'הערה שאינה חוסמת — למשל פרט חסר אצל מרצה חוץ.',
  helpGotIt: 'הבנתי',
  helpDontShow: 'אל תציג שוב'
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
