import { db } from '@/app/dbStore'
import type {
  ScheduleEvent,
  SharedEventApproval,
  SharedEventChangeRequest,
  SharedEventGroup,
  User
} from '@/types'
import { newId } from '@/lib/ids'
import { nowISO, todayISO, toMinutes } from '@/lib/time'
import { upsertDraftEvent } from './scheduleService'
import { addNotification } from './notificationService'

export async function listSharedGroups(): Promise<SharedEventGroup[]> {
  return db.get().sharedGroups
}

export async function listGroupsForTraining(trainingId: string): Promise<SharedEventGroup[]> {
  return db.get().sharedGroups.filter((g) => g.linkedTrainingIds.includes(trainingId))
}

export async function getGroupById(id: string): Promise<SharedEventGroup | null> {
  return db.get().sharedGroups.find((g) => g.id === id) ?? null
}

export async function listChangeRequests(groupId?: string): Promise<SharedEventChangeRequest[]> {
  const all = db.get().changeRequests
  return groupId ? all.filter((r) => r.groupId === groupId) : all
}

export interface CreateSharedEventInput {
  title: string
  date: string
  startTime: string
  endTime: string
  location?: string
  createdByUserId: string
  createdByTrainingId: string
  linkedTrainingIds: string[] // includes the creator's training
}

/**
 * Creates the group and inserts a locked shared event into each linked
 * training's DRAFT. With a single training the group is UNSYNCED (can link
 * later); with several it waits for the other commanders' link approval.
 */
export async function createSharedEvent(input: CreateSharedEventInput): Promise<SharedEventGroup> {
  const groupId = newId('shared')
  const now = nowISO()
  const trainings = db.get().trainings
  const eventIds: Record<string, string> = {}

  for (const trainingId of input.linkedTrainingIds) {
    const event: ScheduleEvent = {
      id: newId('evt'),
      trainingId,
      title: input.title,
      type: 'SHARED',
      flexibilityLevel: 'LOCKED_SHARED',
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: toMinutes(input.endTime) - toMinutes(input.startTime),
      isLocked: true,
      lockReason: 'לו״ז משותף מקושר',
      location: input.location,
      visibleToSoldiers: true,
      sharedGroupId: groupId,
      createdBy: input.createdByUserId,
      createdAt: now,
      updatedAt: now
    }
    await upsertDraftEvent(trainingId, event)
    eventIds[trainingId] = event.id
  }

  const isLinked = input.linkedTrainingIds.length > 1
  const approvals: SharedEventApproval[] = input.linkedTrainingIds.map((trainingId) => {
    const training = trainings.find((t) => t.id === trainingId)
    return {
      trainingId,
      commanderId: training?.commanderId ?? '',
      status: trainingId === input.createdByTrainingId ? 'APPROVED' : 'PENDING',
      decidedAt: trainingId === input.createdByTrainingId ? now : undefined
    }
  })

  const group: SharedEventGroup = {
    id: groupId,
    title: input.title,
    linkedTrainingIds: input.linkedTrainingIds,
    createdByTrainingId: input.createdByTrainingId,
    createdByUserId: input.createdByUserId,
    status: isLinked ? 'PENDING_LINK_APPROVAL' : 'UNSYNCED',
    approvals,
    currentEventIdsByTrainingId: eventIds,
    pendingChangeRequestIds: []
  }
  db.patch({ sharedGroups: [...db.get().sharedGroups, group] })

  // Ask the other commanders to approve the link.
  for (const approval of approvals) {
    if (approval.status === 'PENDING' && approval.commanderId) {
      await addNotification({
        kind: 'APPROVAL_REQUEST',
        title: 'בקשת קישור לו״ז משותף ממתינה לאישורך',
        body: input.title,
        userId: approval.commanderId,
        trainingId: approval.trainingId
      })
    }
  }
  return group
}

export async function approveLink(
  groupId: string,
  trainingId: string
): Promise<SharedEventGroup | null> {
  let updated: SharedEventGroup | null = null
  const sharedGroups = db.get().sharedGroups.map((g) => {
    if (g.id !== groupId) return g
    const approvals = g.approvals.map((a) =>
      a.trainingId === trainingId ? { ...a, status: 'APPROVED' as const, decidedAt: nowISO() } : a
    )
    const allApproved = approvals.every((a) => a.status === 'APPROVED')
    updated = { ...g, approvals, status: allApproved ? 'ACTIVE' : g.status }
    return updated
  })
  db.patch({ sharedGroups })
  return updated
}

export interface RequestChangeInput {
  groupId: string
  requestedByUserId: string
  requestedByTrainingId: string
  description: string
  newDate?: string
  newStartTime?: string
  newEndTime?: string
  newTitle?: string
}

export async function requestSharedChange(
  input: RequestChangeInput
): Promise<SharedEventChangeRequest> {
  const group = await getGroupById(input.groupId)
  if (!group) throw new Error(`Shared group not found: ${input.groupId}`)
  const now = nowISO()
  const trainings = db.get().trainings

  const request: SharedEventChangeRequest = {
    id: newId('screq'),
    groupId: group.id,
    requestedByUserId: input.requestedByUserId,
    requestedByTrainingId: input.requestedByTrainingId,
    requestedAt: now,
    description: input.description,
    newDate: input.newDate,
    newStartTime: input.newStartTime,
    newEndTime: input.newEndTime,
    newTitle: input.newTitle,
    approvals: group.linkedTrainingIds.map((trainingId) => {
      const training = trainings.find((t) => t.id === trainingId)
      return {
        trainingId,
        commanderId: training?.commanderId ?? '',
        status:
          trainingId === input.requestedByTrainingId
            ? ('APPROVED' as const)
            : ('PENDING' as const),
        decidedAt: trainingId === input.requestedByTrainingId ? now : undefined
      }
    }),
    status: 'PENDING'
  }

  db.patch({
    changeRequests: [...db.get().changeRequests, request],
    sharedGroups: db.get().sharedGroups.map((g) =>
      g.id === group.id
        ? {
            ...g,
            status: 'PENDING_CHANGE_APPROVAL',
            pendingChangeRequestIds: [...g.pendingChangeRequestIds, request.id]
          }
        : g
    )
  })

  for (const approval of request.approvals) {
    if (approval.status === 'PENDING' && approval.commanderId) {
      await addNotification({
        kind: 'APPROVAL_REQUEST',
        title: 'בקשת שינוי בלו״ז משותף ממתינה לאישורך',
        body: input.description,
        userId: approval.commanderId,
        trainingId: approval.trainingId
      })
    }
  }
  return request
}

/** Apply an approved change to every linked training's draft. */
async function applyChange(group: SharedEventGroup, request: SharedEventChangeRequest) {
  for (const trainingId of group.linkedTrainingIds) {
    const training = db.get().trainings.find((t) => t.id === trainingId)
    if (!training) continue
    const schedules = db.get().schedules
    const draft = schedules.find((s) => s.id === training.draftScheduleId)
    if (!draft) continue
    const events = draft.events.map((e) =>
      e.sharedGroupId === group.id
        ? {
            ...e,
            title: request.newTitle ?? e.title,
            date: request.newDate ?? e.date,
            startTime: request.newStartTime ?? e.startTime,
            endTime: request.newEndTime ?? e.endTime,
            durationMinutes:
              request.newStartTime && request.newEndTime
                ? toMinutes(request.newEndTime) - toMinutes(request.newStartTime)
                : e.durationMinutes,
            updatedAt: nowISO()
          }
        : e
    )
    db.patch({
      schedules: db
        .get()
        .schedules.map((s) => (s.id === draft.id ? { ...s, events, updatedAt: nowISO() } : s))
    })
    if (training.commanderId) {
      await addNotification({
        kind: 'APPROVAL_DECIDED',
        title: 'שינוי בלו״ז משותף אושר והוחל על הטיוטה',
        body: 'יש לפרסם את הלו״ז כדי שהשינוי יוצג לחיילים.',
        userId: training.commanderId,
        trainingId
      })
    }
  }
}

export async function decideOnChange(
  requestId: string,
  trainingId: string,
  decision: 'APPROVED' | 'REJECTED'
): Promise<SharedEventChangeRequest | null> {
  const request = db.get().changeRequests.find((r) => r.id === requestId)
  if (!request) return null

  const approvals = request.approvals.map((a) =>
    a.trainingId === trainingId ? { ...a, status: decision, decidedAt: nowISO() } : a
  )
  const allApproved = approvals.every((a) => a.status === 'APPROVED')
  const anyRejected = approvals.some((a) => a.status === 'REJECTED')
  const status: SharedEventChangeRequest['status'] = allApproved
    ? 'APPROVED'
    : anyRejected
      ? 'STUCK' // change is stuck until commanders talk (phone contact shown in UI)
      : 'PENDING'

  const updated: SharedEventChangeRequest = { ...request, approvals, status }
  db.patch({
    changeRequests: db.get().changeRequests.map((r) => (r.id === requestId ? updated : r))
  })

  const group = await getGroupById(request.groupId)
  if (group && allApproved) {
    await applyChange(group, updated)
    db.patch({
      sharedGroups: db.get().sharedGroups.map((g) =>
        g.id === group.id
          ? {
              ...g,
              status: 'ACTIVE',
              pendingChangeRequestIds: g.pendingChangeRequestIds.filter((id) => id !== requestId)
            }
          : g
      )
    })
  }
  return updated
}

/** Requests whose proposed date has passed are expired (פג תוקף). */
export async function expireStaleRequests(): Promise<number> {
  const today = todayISO()
  let count = 0
  const changeRequests = db.get().changeRequests.map((r) => {
    if (r.status === 'PENDING' && r.newDate && r.newDate < today) {
      count += 1
      return { ...r, status: 'EXPIRED' as const }
    }
    return r
  })
  db.patch({ changeRequests })
  return count
}

/** Contact details for the commanders who have not approved yet. */
export async function pendingContacts(
  requestId: string
): Promise<{ name: string; phone?: string; trainingName: string }[]> {
  const request = db.get().changeRequests.find((r) => r.id === requestId)
  if (!request) return []
  const { users, trainings } = db.get()
  return request.approvals
    .filter((a) => a.status !== 'APPROVED')
    .map((a) => {
      const user = users.find((u) => u.id === a.commanderId)
      const training = trainings.find((t) => t.id === a.trainingId)
      return {
        name: user?.displayName ?? '',
        phone: user?.phone,
        trainingName: training?.name ?? ''
      }
    })
}

export function isChangeRelevantToUser(request: SharedEventChangeRequest, user: User): boolean {
  return request.approvals.some((a) => a.commanderId === user.id && a.status === 'PENDING')
}
