import type {
  ImpactReport,
  MovedEvent,
  OverwrittenEvent,
  ScheduleConflict,
  ScheduleEvent,
  SharedEventGroup,
  SoldierVisibleChange,
  Training,
  User
} from '@/types'
import { makeIdFactory } from '@/lib/ids'
import { timeRangesOverlap } from '@/lib/time'

export interface BuildImpactReportInput {
  summary: string
  trainingId: string
  before: ScheduleEvent[]
  after: ScheduleEvent[]
  conflictsCreated?: ScheduleConflict[]
  allTrainings?: Training[]
  allUsers?: User[]
  sharedGroups?: SharedEventGroup[]
  recommendedAction?: string
}

/**
 * Compares two event sets and produces the commander-facing impact report.
 * Events are matched by id first, then by (type, title) for regenerated sets.
 */
export function buildImpactReport(input: BuildImpactReportInput): ImpactReport {
  const nextId = makeIdFactory('impact')
  const { before, after } = input

  const afterById = new Map(after.map((e) => [e.id, e]))
  const matchedAfterIds = new Set<string>()
  const moved: MovedEvent[] = []
  const removed: ScheduleEvent[] = []

  // Pass 1: match by id.
  const unmatchedBefore: ScheduleEvent[] = []
  for (const b of before) {
    const a = afterById.get(b.id)
    if (a) {
      matchedAfterIds.add(a.id)
      if (a.date !== b.date || a.startTime !== b.startTime || a.endTime !== b.endTime) {
        moved.push(toMoved(b, a))
      }
    } else {
      unmatchedBefore.push(b)
    }
  }

  // Pass 2: match leftovers by type+title (regeneration changes ids).
  const remainingAfter = after.filter((e) => !matchedAfterIds.has(e.id))
  for (const b of unmatchedBefore) {
    const idx = remainingAfter.findIndex((a) => a.type === b.type && a.title === b.title)
    if (idx >= 0) {
      const a = remainingAfter[idx]
      remainingAfter.splice(idx, 1)
      matchedAfterIds.add(a.id)
      if (a.date !== b.date || a.startTime !== b.startTime || a.endTime !== b.endTime) {
        moved.push(toMoved(b, a))
      }
    } else {
      removed.push(b)
    }
  }

  // Removed events: report what now occupies their old slot.
  const overwritten: OverwrittenEvent[] = removed.map((b) => {
    const occupier = after.find(
      (a) => a.date === b.date && timeRangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)
    )
    return {
      eventId: b.id,
      title: b.title,
      trainingId: b.trainingId,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      overwrittenByTitle: occupier?.title ?? 'הרכיב הוסר מהלו״ז'
    }
  })

  // Which other trainings are affected (through linked shared events)?
  const affectedTrainingIds = new Set<string>()
  const changedSharedGroupIds = new Set(
    [...moved.map((m) => m.eventId), ...removed.map((r) => r.id)]
      .map((id) => before.find((e) => e.id === id)?.sharedGroupId)
      .filter((g): g is string => Boolean(g))
  )
  for (const groupId of changedSharedGroupIds) {
    const group = input.sharedGroups?.find((g) => g.id === groupId)
    for (const tid of group?.linkedTrainingIds ?? []) {
      if (tid !== input.trainingId) affectedTrainingIds.add(tid)
    }
  }

  const affectedTrainings = [...affectedTrainingIds].map((tid) => {
    const training = input.allTrainings?.find((t) => t.id === tid)
    return {
      trainingId: tid,
      trainingName: training?.name ?? tid,
      reason: 'שינוי בלו״ז משותף מקושר'
    }
  })

  // Approvals required from the other commanders of affected trainings.
  const approvalsRequired = [...affectedTrainingIds].map((tid) => {
    const training = input.allTrainings?.find((t) => t.id === tid)
    const commander = input.allUsers?.find((u) => u.id === training?.commanderId)
    return {
      trainingId: tid,
      trainingName: training?.name ?? tid,
      commanderId: training?.commanderId ?? '',
      commanderName: commander?.displayName ?? '',
      commanderPhone: commander?.phone,
      status: 'PENDING' as const
    }
  })

  const soldierVisibleChanges: SoldierVisibleChange[] = [
    ...moved
      .filter((m) => before.find((e) => e.id === m.eventId)?.visibleToSoldiers !== false)
      .map((m) => ({
        trainingId: input.trainingId,
        eventId: m.eventId,
        description: `"${m.title}" הוזז מ-${m.fromDate} ${m.fromStartTime} ל-${m.toDate} ${m.toStartTime}.`
      })),
    ...removed
      .filter((e) => e.visibleToSoldiers !== false)
      .map((e) => ({
        trainingId: input.trainingId,
        eventId: e.id,
        description: `"${e.title}" הוסר מהלו״ז.`
      }))
  ]

  const hasSharedChanges = changedSharedGroupIds.size > 0

  return {
    id: nextId(),
    summary: input.summary,
    affectedTrainings,
    movedEvents: moved,
    overwrittenEvents: overwritten,
    conflictsCreated: input.conflictsCreated ?? [],
    approvalsRequired,
    soldierVisibleChanges,
    recommendedAction: input.recommendedAction,
    canUndo: !hasSharedChanges
  }
}

function toMoved(b: ScheduleEvent, a: ScheduleEvent): MovedEvent {
  return {
    eventId: b.id,
    title: b.title,
    trainingId: b.trainingId,
    fromDate: b.date,
    fromStartTime: b.startTime,
    fromEndTime: b.endTime,
    toDate: a.date,
    toStartTime: a.startTime,
    toEndTime: a.endTime
  }
}
