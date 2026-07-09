import { db } from '@/app/dbStore'
import type { AppNotification, User } from '@/types'
import { newId } from '@/lib/ids'
import { nowISO } from '@/lib/time'

export async function addNotification(
  input: Omit<AppNotification, 'id' | 'createdAt'>
): Promise<AppNotification> {
  const notification: AppNotification = { ...input, id: newId('notif'), createdAt: nowISO() }
  db.patch({ notifications: [notification, ...db.get().notifications] })
  return notification
}

/** Targeted to the user directly, or broadcast to their role within a training they belong to. */
export async function listNotificationsForUser(user: User): Promise<AppNotification[]> {
  const { notifications, trainings } = db.get()
  const myTrainingIds = new Set(
    trainings
      .filter((t) => {
        switch (user.role) {
          case 'ADMIN':
            return true
          case 'SENIOR_COMMANDER':
            return t.seniorCommanderId === user.id
          case 'TRAINING_COMMANDER':
            return t.commanderId === user.id
          case 'SOLDIER':
            return t.soldierIds.includes(user.id)
        }
      })
      .map((t) => t.id)
  )
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

export async function markNotificationRead(id: string): Promise<void> {
  db.patch({
    notifications: db
      .get()
      .notifications.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? nowISO() } : n))
  })
}

export async function markAllRead(user: User): Promise<void> {
  const mine = await listNotificationsForUser(user)
  const ids = new Set(mine.map((n) => n.id))
  db.patch({
    notifications: db
      .get()
      .notifications.map((n) => (ids.has(n.id) ? { ...n, readAt: n.readAt ?? nowISO() } : n))
  })
}
