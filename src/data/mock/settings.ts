import type { TrainingSettings } from '@/types'

export function defaultTrainingSettings(): TrainingSettings {
  return {
    timeSlotMinutes: 15,
    weekStartsOn: 'SUNDAY',
    defaultDayStart: '08:00',
    defaultDayEnd: '20:00',
    fridayEnabled: true,
    fridayStart: '08:00',
    fridayEnd: '14:00',
    saturdayEnabled: false,
    // Manual post-Shabbat slot; no automatic Shabbat-end calculation in v1.
    saturdayStart: '19:15',
    saturdayEnd: '20:00',
    allowMonthView: true,
    allowSoldiersToSeeNextWeek: true,
    approvalRequiredForTrainingCommanderEdits: false,
    baseLocation: 'בה״ד 15',
    lunchWindow: { earliestStart: '11:30', latestStart: '12:30', durationMinutes: 60 },
    dinnerWindow: {
      earliestStart: '17:30',
      latestStart: '18:30',
      latestEnd: '19:30',
      durationMinutes: 60
    }
  }
}
