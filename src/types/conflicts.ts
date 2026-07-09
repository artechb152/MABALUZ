export type ConflictSeverity = 'INFO' | 'WARNING' | 'BLOCKING'

export interface ScheduleConflict {
  id: string
  severity: ConflictSeverity
  title: string
  description: string
  eventIds: string[]
  trainingIds: string[]
  suggestedResolutionIds: string[]
  canOverride: boolean
}

export interface ScheduleWarning {
  id: string
  title: string
  description: string
  eventIds: string[]
}

export interface ImpossibleScheduleItem {
  id: string
  title: string
  durationMinutes: number
  reason: string
  sourceImportItemId?: string
  sourceEventId?: string
}

export type SuggestedActionKind =
  | 'MOVE_EVENT'
  | 'SHORTEN_EVENT'
  | 'REMOVE_EVENT'
  | 'EXTEND_TRAINING'
  | 'USE_GUEST_RESERVE'
  | 'MANUAL_RESOLVE'
  | 'MARK_IMPOSSIBLE'

export interface SuggestedAction {
  id: string
  kind: SuggestedActionKind
  description: string
  eventId?: string
  newDate?: string
  newStartTime?: string
  newEndTime?: string
  shortenToMinutes?: number
  extendByDays?: number
}

export interface ReschedulingSuggestion {
  id: string
  title: string
  description: string
  recommended: boolean
  actions: SuggestedAction[]
  impactSummary: string
}
