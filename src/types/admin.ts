import type { UserRole } from './user'

export interface FeatureToggles {
  requireAdminApprovalForSeniorCommanders: boolean // default false
  requireSeniorApprovalForTrainingCommanders: boolean // default false
  enableRealAuth: boolean // default false
  enableMongoDb: boolean // default false
  enableOutlookIntegration: boolean // default false
  enableAiAnalysis: boolean // default false
  enableSoldierNextWeekView: boolean
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  order: number
}

export interface RoleApprovalRequest {
  id: string
  userId: string
  requestedRole: UserRole
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  decidedByUserId?: string
  decidedAt?: string
}
