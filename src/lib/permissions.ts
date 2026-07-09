import type { AppNotification, Training, User, UserRole } from '@/types'

/** Which trainings a user can see — the core permission rule. */
export function filterTrainingsForUser(trainings: Training[], user: User): Training[] {
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

export function filterNotificationsForUser(
  notifications: AppNotification[],
  trainings: Training[],
  user: User
): AppNotification[] {
  const myTrainingIds = new Set(filterTrainingsForUser(trainings, user).map((t) => t.id))
  return notifications.filter((n) => {
    if (n.userId) return n.userId === user.id
    if (n.role) {
      if (n.role !== user.role) return false
      if (n.trainingId) return myTrainingIds.has(n.trainingId)
      return true
    }
    return false
  })
}

export function canEditSchedules(role: UserRole): boolean {
  return role === 'TRAINING_COMMANDER' || role === 'SENIOR_COMMANDER' || role === 'ADMIN'
}

export function canSeeLecturerDatabase(role: UserRole): boolean {
  return role !== 'SOLDIER'
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN'
}
