export const peakCopy = {
  basicOnly: 'פרטים בסיסיים בלבד',
  deleteConfirm: 'למחוק את יום השיא מהטיוטה?',
  activityType: 'סוג פעילות',
  overlapListTitle: 'רכיבים קיימים ביום זה שיושפעו:',
  saved: 'יום השיא נוסף לטיוטה.',
  savedWithConflicts: (n: number) => `יום השיא נוסף לטיוטה. נוצרו ${n} קונפליקטים — מומלץ לבדוק במרכז הקונפליקטים.`,
  goConflicts: 'למרכז הקונפליקטים',
  notesLabel: 'הערות (אופציונלי)',
  dateOutOfRange: 'התאריך מחוץ לטווח ההכשרה.'
} as const
