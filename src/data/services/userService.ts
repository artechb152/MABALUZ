import { db } from '@/app/dbStore'
import type { User } from '@/types'
import { nowISO } from '@/lib/time'

export async function listUsers(): Promise<User[]> {
  return db.get().users
}

export async function getUserById(id: string): Promise<User | null> {
  return db.get().users.find((u) => u.id === id) ?? null
}

export async function listCommanders(): Promise<User[]> {
  return db.get().users.filter(
    (u) => u.role === 'TRAINING_COMMANDER' || u.role === 'SENIOR_COMMANDER'
  )
}

export async function updateUser(id: string, changes: Partial<User>): Promise<User | null> {
  const users = db.get().users.map((u) =>
    u.id === id ? { ...u, ...changes, id: u.id, updatedAt: nowISO() } : u
  )
  db.patch({ users })
  return users.find((u) => u.id === id) ?? null
}
