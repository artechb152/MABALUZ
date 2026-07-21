import type { Training } from '@/types'
import { addDaysISO, todayISO } from '@/lib/time'
import { defaultTrainingSettings } from './settings'

const SEED_TIME = '2026-01-01T08:00:00.000Z'

export const TRAINING_INTEL_ID = 'training-intel-24'
export const TRAINING_OPS_ID = 'training-ops-17'
export const TRAINING_CONTROL_ID = 'training-control-08'
export const TRAINING_CYBER_ID = 'training-cyber-03'

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
  },
  // Two more trainings under the same commander, so the training picker and
  // switching between different dashboard states can be smoke-tested.
  {
    id: TRAINING_CONTROL_ID,
    name: 'הכשרת בקרה מחזור 8',
    symbol: 'בקרה-8',
    cycleNumber: '8',
    courseType: 'הכשרת בסיס',
    base: 'בה״ד 15',
    unit: 'מערך ההדרכה',
    startDate: addDaysISO(today, -3),
    endDate: addDaysISO(today, 18),
    commanderId: 'user-commander-noam',
    seniorCommanderId: 'user-senior-daniel',
    soldierIds: [],
    pendingSoldiers: [],
    settings: defaultTrainingSettings(),
    status: 'ACTIVE',
    draftScheduleId: 'schedule-control-draft',
    publishedScheduleId: 'schedule-control-pub',
    previousPublishedScheduleIds: [],
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  },
  {
    id: TRAINING_CYBER_ID,
    name: 'קורס חוקרי סייבר מחזור 3',
    symbol: 'סייבר-3',
    cycleNumber: '3',
    courseType: 'הכשרת המשך',
    base: 'בה״ד 15',
    unit: 'מערך ההדרכה',
    startDate: addDaysISO(today, -1),
    endDate: addDaysISO(today, 25),
    commanderId: 'user-commander-noam',
    seniorCommanderId: 'user-senior-daniel',
    soldierIds: [],
    pendingSoldiers: [],
    settings: defaultTrainingSettings(),
    status: 'ACTIVE',
    draftScheduleId: 'schedule-cyber-draft',
    publishedScheduleId: 'schedule-cyber-pub',
    previousPublishedScheduleIds: [],
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME
  }
]
