import type { PendingSoldier } from './user'
import type { ImportedContentItem } from './excel-import'

export interface MealWindow {
  earliestStart: string // "HH:mm"
  latestStart: string
  durationMinutes: number
}

export interface DinnerWindow extends MealWindow {
  latestEnd: string
}

export interface TrainingSettings {
  timeSlotMinutes: 15
  weekStartsOn: 'SUNDAY'
  defaultDayStart: string // "08:00"
  defaultDayEnd: string // "20:00"
  fridayEnabled: boolean
  fridayStart: string // "08:00"
  fridayEnd: string // "14:00"
  saturdayEnabled: boolean
  saturdayStart: string // default "19:15" (manual, no automatic Shabbat-end calc in v1)
  saturdayEnd: string // default "20:00"
  allowMonthView: boolean
  allowSoldiersToSeeNextWeek: boolean
  approvalRequiredForTrainingCommanderEdits: boolean
  baseLocation: string // "בה״ד 15"
  lunchWindow: MealWindow
  dinnerWindow: DinnerWindow
}

export type TrainingStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

export interface Training {
  id: string
  name: string
  symbol: string
  cycleNumber: string
  courseType?: string
  base: string // default בה"ד 15
  unit: string
  startDate: string // "yyyy-MM-dd"
  endDate: string
  commanderId: string
  seniorCommanderId?: string
  soldierIds: string[]
  pendingSoldiers: PendingSoldier[]
  settings: TrainingSettings
  status: TrainingStatus
  draftScheduleId?: string
  publishedScheduleId?: string
  previousPublishedScheduleIds: string[]
  createdAt: string
  updatedAt: string
}

export type CoursePresetStatus = 'READY' | 'PLACEHOLDER' | 'DISABLED'

export interface CoursePreset {
  id: string
  name: string
  description: string
  status: CoursePresetStatus
  defaultSettings?: Partial<TrainingSettings>
  defaultFlexibleContent?: ImportedContentItem[]
}
