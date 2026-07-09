export const sharedCopy = {
  requestChange: 'בקש שינוי',
  noRequests: 'אין בקשות שינוי.',
  requestedBy: (name: string) => `הוגשה על ידי ${name}`,
  proposedTime: 'מועד מוצע',
  appliedToDrafts: 'השינוי אושר על ידי כל המפקדים והוחל על הטיוטות. יש לפרסם את הלו״ז בכל הכשרה.',
  createTitle: 'יצירת לו״ז משותף',
  eventDetails: 'פרטי הרכיב',
  linkTrainings: 'קישור הכשרות',
  myTrainingAlways: 'ההכשרה שלך תמיד כלולה.',
  overlapWarningTitle: 'שימו לב — התנגשות עם רכיבים קיימים',
  overlapIn: (training: string, titles: string) => `ב${training}: ${titles}`,
  created: 'הלו״ז המשותף נוצר והוסף לטיוטות ההכשרות המקושרות.',
  changeTitle: 'בקשת שינוי בלו״ז משותף',
  changeDescription: 'תיאור השינוי',
  submitted: 'הבקשה נשלחה לאישור המפקדים הרלוונטיים.',
  noContacts: 'אין אנשי קשר להצגה.'
} as const
