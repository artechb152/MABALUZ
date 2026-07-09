export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'PREVIOUS'

export type ScheduleEventType =
  | 'SHARED'
  | 'PEAK_DAY'
  | 'GUEST_LECTURE'
  | 'FLEXIBLE_CONTENT'
  | 'MEAL_BREAK'
  | 'COMMANDER_TIME'
  | 'FORMATION'
  | 'TEAM_ACTIVITY'
  | 'CUSTOM'

export type FlexibilityLevel =
  | 'LOCKED_SHARED'
  | 'LOCKED_PEAK_DAY'
  | 'LOCKED_GUEST_LECTURE'
  | 'SEMI_FLEXIBLE'
  | 'FLEXIBLE'

// UI term: רכיב לו"ז
export interface ScheduleEvent {
  id: string
  trainingId: string
  scheduleId?: string

  title: string
  shortDescription?: string
  description?: string

  type: ScheduleEventType
  flexibilityLevel: FlexibilityLevel

  date: string // "yyyy-MM-dd"
  startTime: string // "HH:mm", 15-minute grid
  endTime: string
  durationMinutes: number

  isFullDay?: boolean
  isLocked: boolean
  lockReason?: string

  location?: string
  instructorName?: string
  lecturerId?: string
  equipment?: string[]
  commanderNotes?: string
  soldierNotes?: string

  visibleToSoldiers: boolean
  showBasicDetailsOnly?: boolean

  color?: string

  sharedGroupId?: string
  peakDayId?: string

  createdBy: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
}

export interface Schedule {
  id: string
  trainingId: string
  versionNumber: number
  status: ScheduleStatus
  events: ScheduleEvent[]
  lockedDates?: string[] // days locked by the commander ("yyyy-MM-dd")
  generatedFromImportIds: string[]
  changeSummary?: string
  commanderNote?: string
  publishedAt?: string
  publishedBy?: string
  createdAt: string
  updatedAt: string
}
