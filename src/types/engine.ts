import type { Training, TrainingSettings } from './training'
import type { Schedule, ScheduleEvent } from './schedule'
import type {
  ScheduleConflict,
  ScheduleWarning,
  ReschedulingSuggestion,
  ImpossibleScheduleItem
} from './conflicts'
import type { ImpactReport } from './impact'
import type { ImportedTrainingTemplate } from './excel-import'

export interface ScheduleGenerationInput {
  training: Training
  importedTrainingTemplate: ImportedTrainingTemplate | null
  existingDraftEvents: ScheduleEvent[]
  hardEvents: ScheduleEvent[]
  knownGuestLectures: ScheduleEvent[]
  sharedEvents: ScheduleEvent[]
  peakDays: ScheduleEvent[]
  manualFlexibleEvents: ScheduleEvent[]
  settings: TrainingSettings
}

export interface ScheduleGenerationOutput {
  schedule: Schedule
  conflicts: ScheduleConflict[]
  warnings: ScheduleWarning[]
  impactReport: ImpactReport
  suggestions: ReschedulingSuggestion[]
  impossibleItems: ImpossibleScheduleItem[]
}
