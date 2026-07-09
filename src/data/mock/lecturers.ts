import type { GuestLecturer } from '@/types'

const SEED_TIME = '2026-01-01T08:00:00.000Z'

export const mockLecturers: GuestLecturer[] = [
  {
    id: 'lecturer-amit-barak',
    fullName: 'ד״ר עמית ברק',
    role: 'חוקר אורח',
    organization: 'מכון מחקר (דוגמה)',
    email: 'amit.barak@example.org',
    phone: '050-0000101',
    lectureTypes: ['מבוא לעבודה מודיעינית', 'מתודולוגיות מחקר'],
    notes: 'מעדיף שעות בוקר.',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'lecturer-roni-shalev',
    fullName: 'גב׳ רוני שלו',
    role: 'מרצה בתחום הדרכה',
    organization: 'יחידת הדרכה (דוגמה)',
    email: 'roni.shalev@example.org',
    phone: '050-0000102',
    lectureTypes: ['מיומנויות הדרכה', 'תקשורת בין-אישית'],
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'lecturer-eitan-rozen',
    fullName: 'רס״ן במיל׳ איתן רוזן',
    role: 'מומחה תוכן',
    email: 'eitan.rozen@example.org',
    phone: '050-0000103',
    lectureTypes: ['ניתוח אירועים', 'תחקירים מבצעיים'],
    notes: 'זמין בעיקר בימי שלישי-חמישי.',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  }
]
