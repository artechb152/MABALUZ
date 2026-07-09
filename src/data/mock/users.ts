import type { User } from '@/types'

const SEED_TIME = '2026-01-01T08:00:00.000Z'

// Obviously-fake personal numbers (90000xx) and example.org contact details.
export const mockUsers: User[] = [
  {
    id: 'user-soldier-yoav',
    personalNumber: '9000011',
    firstName: 'יואב',
    lastName: 'כהן',
    displayName: 'רב״ט יואב כהן',
    role: 'SOLDIER',
    unit: 'מערך ההדרכה',
    profileStatus: 'ACTIVE',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'user-soldier-maya',
    personalNumber: '9000012',
    firstName: 'מאיה',
    lastName: 'פרץ',
    displayName: 'רב״ט מאיה פרץ',
    role: 'SOLDIER',
    unit: 'מערך ההדרכה',
    profileStatus: 'ACTIVE',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'user-commander-noam',
    personalNumber: '9000021',
    firstName: 'נועם',
    lastName: 'לוי',
    displayName: 'סגן נועם לוי',
    role: 'TRAINING_COMMANDER',
    email: 'noam.levi@example.org',
    phone: '050-0000021',
    unit: 'מערך ההדרכה',
    profileStatus: 'ACTIVE',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'user-commander-shira',
    personalNumber: '9000022',
    firstName: 'שירה',
    lastName: 'אמסלם',
    displayName: 'סגן שירה אמסלם',
    role: 'TRAINING_COMMANDER',
    email: 'shira.amsalem@example.org',
    phone: '050-0000022',
    unit: 'מערך ההדרכה',
    profileStatus: 'ACTIVE',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'user-senior-daniel',
    personalNumber: '9000031',
    firstName: 'דניאל',
    lastName: 'מזרחי',
    displayName: 'רס״ן דניאל מזרחי',
    role: 'SENIOR_COMMANDER',
    email: 'daniel.mizrahi@example.org',
    phone: '050-0000031',
    unit: 'מערך ההדרכה',
    profileStatus: 'ACTIVE',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: 'user-admin-artech',
    personalNumber: '9000099',
    firstName: 'מנהל',
    lastName: 'מערכת',
    displayName: 'מנהל מערכת ARTECH',
    role: 'ADMIN',
    email: 'artech.admin@example.org',
    phone: '050-0000099',
    unit: 'ARTECH',
    profileStatus: 'ACTIVE',
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  }
]
