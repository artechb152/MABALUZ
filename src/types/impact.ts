import type { ScheduleConflict } from './conflicts'
import type { ApprovalStatus } from './shared-events'

export interface AffectedTraining {
  trainingId: string
  trainingName: string
  reason: string
}

export interface MovedEvent {
  eventId: string
  title: string
  trainingId: string
  fromDate: string
  fromStartTime: string
  fromEndTime: string
  toDate: string
  toStartTime: string
  toEndTime: string
}

export interface OverwrittenEvent {
  eventId: string
  title: string
  trainingId: string
  date: string
  startTime: string
  endTime: string
  overwrittenByTitle: string
}

export interface ApprovalRequirement {
  trainingId: string
  trainingName: string
  commanderId: string
  commanderName: string
  commanderPhone?: string
  status: ApprovalStatus
}

export interface SoldierVisibleChange {
  trainingId: string
  description: string
  eventId?: string
}

export interface ImpactReport {
  id: string
  summary: string
  affectedTrainings: AffectedTraining[]
  movedEvents: MovedEvent[]
  overwrittenEvents: OverwrittenEvent[]
  conflictsCreated: ScheduleConflict[]
  approvalsRequired: ApprovalRequirement[]
  soldierVisibleChanges: SoldierVisibleChange[]
  recommendedAction?: string
  canUndo: boolean
}
