import { db } from '@/app/dbStore'
import type { PendingSoldier, Schedule, Training, TrainingSettings, User } from '@/types'
import { defaultTrainingSettings } from '@/data/mock/settings'
import { newId } from '@/lib/ids'
import { nowISO } from '@/lib/time'

export async function listTrainings(): Promise<Training[]> {
  return db.get().trainings
}

export async function getTrainingById(id: string): Promise<Training | null> {
  return db.get().trainings.find((t) => t.id === id) ?? null
}

/** Role-scoped visibility: the core permission rule of the app. */
export async function listTrainingsForUser(user: User): Promise<Training[]> {
  const trainings = db.get().trainings
  switch (user.role) {
    case 'ADMIN':
      return trainings
    case 'SENIOR_COMMANDER':
      return trainings.filter((t) => t.seniorCommanderId === user.id)
    case 'TRAINING_COMMANDER':
      return trainings.filter((t) => t.commanderId === user.id)
    case 'SOLDIER':
      return trainings.filter(
        (t) =>
          t.soldierIds.includes(user.id) ||
          t.pendingSoldiers.some((p) => p.personalNumber === user.personalNumber)
      )
  }
}

export async function listActiveTrainingsAtBase(base: string): Promise<Training[]> {
  return db.get().trainings.filter((t) => t.base === base && t.status === 'ACTIVE')
}

export interface CreateTrainingInput {
  name: string
  symbol: string
  cycleNumber: string
  courseType?: string
  base?: string
  unit: string
  startDate: string
  endDate: string
  commanderId: string
  seniorCommanderId?: string
  soldierIds?: string[]
  pendingSoldiers?: PendingSoldier[]
  settings?: TrainingSettings
}

export async function createTraining(input: CreateTrainingInput): Promise<Training> {
  const now = nowISO()
  const trainingId = newId('training')
  const draftId = newId('schedule')

  const draft: Schedule = {
    id: draftId,
    trainingId,
    versionNumber: 1,
    status: 'DRAFT',
    events: [],
    generatedFromImportIds: [],
    createdAt: now,
    updatedAt: now
  }

  const training: Training = {
    id: trainingId,
    name: input.name,
    symbol: input.symbol,
    cycleNumber: input.cycleNumber,
    courseType: input.courseType,
    base: input.base ?? 'בה״ד 15',
    unit: input.unit,
    startDate: input.startDate,
    endDate: input.endDate,
    commanderId: input.commanderId,
    seniorCommanderId: input.seniorCommanderId,
    soldierIds: input.soldierIds ?? [],
    pendingSoldiers: input.pendingSoldiers ?? [],
    settings: input.settings ?? defaultTrainingSettings(),
    status: 'PLANNING',
    draftScheduleId: draftId,
    previousPublishedScheduleIds: [],
    createdAt: now,
    updatedAt: now
  }

  db.patch({
    trainings: [...db.get().trainings, training],
    schedules: [...db.get().schedules, draft]
  })
  return training
}

export async function updateTraining(
  id: string,
  changes: Partial<Training>
): Promise<Training | null> {
  const trainings = db.get().trainings.map((t) =>
    t.id === id ? { ...t, ...changes, id: t.id, updatedAt: nowISO() } : t
  )
  db.patch({ trainings })
  return trainings.find((t) => t.id === id) ?? null
}

export async function addPendingSoldier(
  trainingId: string,
  soldier: PendingSoldier
): Promise<void> {
  const trainings = db.get().trainings.map((t) =>
    t.id === trainingId
      ? { ...t, pendingSoldiers: [...t.pendingSoldiers, soldier], updatedAt: nowISO() }
      : t
  )
  db.patch({ trainings })
}

/**
 * Future-registration hook: when a user with a matching personal number signs
 * in, link them to any training that listed them as a pending soldier.
 */
export async function linkPendingSoldier(user: User): Promise<void> {
  const trainings = db.get().trainings.map((t) => {
    const pending = t.pendingSoldiers.find((p) => p.personalNumber === user.personalNumber)
    if (!pending) return t
    return {
      ...t,
      soldierIds: t.soldierIds.includes(user.id) ? t.soldierIds : [...t.soldierIds, user.id],
      pendingSoldiers: t.pendingSoldiers.filter((p) => p.personalNumber !== user.personalNumber),
      updatedAt: nowISO()
    }
  })
  db.patch({ trainings })
}
