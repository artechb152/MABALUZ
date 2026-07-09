import { useDb } from './dbStore'
import { useSession } from './sessionStore'
import { useUi } from './uiStore'
import { filterNotificationsForUser, filterTrainingsForUser } from '@/lib/permissions'
import type { Schedule, Training, User, UserRole } from '@/types'

// Reactive READ hooks over the in-memory db. Mutations must go through
// src/data/services/* — never patch the store from components.

export function useCurrentUser(): User | null {
  return useSession((s) => s.currentUser)
}

/** Role after applying the commander's "soldier preview" toggle. */
export function useEffectiveRole(): UserRole | null {
  const user = useCurrentUser()
  const preview = useSession((s) => s.soldierPreview)
  if (!user) return null
  return preview ? 'SOLDIER' : user.role
}

export function useMyTrainings(): Training[] {
  const user = useCurrentUser()
  const trainings = useDb((s) => s.trainings)
  if (!user) return []
  return filterTrainingsForUser(trainings, user)
}

/** The training currently being worked on (topbar selector / role default). */
export function useSelectedTraining(): Training | null {
  const myTrainings = useMyTrainings()
  const selectedId = useUi((s) => s.selectedTrainingId)
  return myTrainings.find((t) => t.id === selectedId) ?? myTrainings[0] ?? null
}

export function useSchedule(scheduleId: string | undefined): Schedule | null {
  return useDb((s) => s.schedules.find((sc) => sc.id === scheduleId) ?? null)
}

export function useDraftSchedule(training: Training | null): Schedule | null {
  return useSchedule(training?.draftScheduleId)
}

export function usePublishedSchedule(training: Training | null): Schedule | null {
  return useSchedule(training?.publishedScheduleId)
}

export function useMyNotifications() {
  const user = useCurrentUser()
  const notifications = useDb((s) => s.notifications)
  const trainings = useDb((s) => s.trainings)
  if (!user) return []
  return filterNotificationsForUser(notifications, trainings, user)
}

export function useUnreadCount(): number {
  return useMyNotifications().filter((n) => !n.readAt).length
}
