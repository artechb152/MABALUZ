import type { ScheduleEventType, FlexibilityLevel } from './schedule'

export type ImportConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ImportedContentItem {
  id: string
  title: string
  normalizedTitle: string
  averageDurationMinutes: number
  occurrences: number
  confidence: ImportConfidence
  suggestedEventType: ScheduleEventType
  suggestedFlexibilityLevel: FlexibilityLevel
  notes?: string
  // Review-screen state:
  included: boolean
  markedAsGuestLectureReserve: boolean
  markedAsOneOff: boolean
  // Learning hints:
  typicalDayIndexes?: number[] // 0 = Sunday
  typicalStartTime?: string
  sourceFileNames?: string[]
}

export interface ImportedTrainingTemplate {
  id: string
  trainingId: string
  sourceFileNames: string[]
  items: ImportedContentItem[]
  // Learned from previous schedules; drives the guest-lecture reserve.
  averageGuestLectureMinutesPerTraining: number
  typicalLunchStart?: string
  typicalDinnerStart?: string
  createdAt: string
}

// Raw parse output (before learning/aggregation).
export interface ExcelParsedBlock {
  dayIndex: number // 0 = Sunday ... 6 = Saturday
  startTime: string
  endTime: string
  title: string
}

export interface ExcelParsedSchedule {
  fileName: string
  dayHeaders: string[]
  blocks: ExcelParsedBlock[]
  warnings: string[]
}
