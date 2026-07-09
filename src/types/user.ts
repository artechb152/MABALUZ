export type UserRole = 'SOLDIER' | 'TRAINING_COMMANDER' | 'SENIOR_COMMANDER' | 'ADMIN'

export type ProfileStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'DISABLED'

export interface User {
  id: string
  personalNumber: string
  firstName: string
  lastName: string
  displayName: string
  role: UserRole
  email?: string
  phone?: string
  unit?: string
  profileStatus: ProfileStatus
  createdAt: string
  updatedAt: string
}

// Soldiers typed in manually before they have an account; auto-linked on
// future registration by matching personal number.
export interface PendingSoldier {
  personalNumber: string
  firstName: string
  lastName?: string
}
