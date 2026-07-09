import type { Training } from '@/types'
import { addDaysISO, todayISO } from '@/lib/time'
import { defaultTrainingSettings } from './settings'

const SEED_TIME = '2026-01-01T08:00:00.000Z'

export const TRAINING_INTEL_ID = 'training-intel-24'
export const TRAINING_OPS_ID = 'training-ops-17'

// Seed dates are computed relative to today so the app always shows a live,
// mid-training picture (see ASSUMPTIONS.md #18). Ids stay deterministic.
const today = todayISO()

export const mockTrainings: Training[] = [
  {
    id: TRAINING_INTEL_ID,
    name: 'הכשרת מודיעין מחזור 24',
    symbol: 'מדן-24',
    cycleNumber: '24',
    courseType: 'הכשרת בסיס',
    base: 'בה״ד 15',
    unit: 'מערך ההדרכה',
    startDate: addDaysISO(today, -7),
    endDate: addDaysISO(today, 13), // ~3 weeks total
    commanderId: 'user-commander-noam',
    seniorCommanderId: 'user-senior-daniel',
    soldierIds: ['user-soldier-yoav', 'user-soldier-maya'],
    pendingSoldiers: [{ personalNumber: '9000013', firstName: 'איתי' }],
    settings: defaultTrainingSettings(),
    status: 'ACTIVE',
    draftScheduleId: 'schedule-intel-draft',
    publishedScheduleId: 'schedule-intel-pub',
    previousPublishedScheduleIds: ['schedule-intel-prev1'],
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: TRAINING_OPS_ID,
    name: 'הכשרת מפעילים מחזור 17',
    symbol: 'מפע-17',
    cycleNumber: '17',
    courseType: 'הכשרת המשך',
    base: 'בה״ד 15',
    unit: 'מערך ההדרכה',
    startDate: addDaysISO(today, -14),
    endDate: addDaysISO(today, 7),
    commanderId: 'user-commander-shira',
    seniorCommanderId: 'user-senior-daniel',
    soldierIds: [],
    pendingSoldiers: [],
    settings: defaultTrainingSettings(),
    status: 'ACTIVE',
    draftScheduleId: 'schedule-ops-draft',
    publishedScheduleId: 'schedule-ops-pub',
    previousPublishedScheduleIds: [],
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  }
]
