export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

export interface SharedEventApproval {
  trainingId: string
  commanderId: string
  status: ApprovalStatus
  decidedAt?: string
  note?: string
}

export type SharedGroupStatus =
  | 'ACTIVE'
  | 'PENDING_LINK_APPROVAL'
  | 'PENDING_CHANGE_APPROVAL'
  | 'UNSYNCED'

// A proposed change to a linked shared event; applies only after every
// affected commander approves. Expired when the proposed date passes.
export interface SharedEventChangeRequest {
  id: string
  groupId: string
  requestedByUserId: string
  requestedByTrainingId: string
  requestedAt: string
  description: string
  newDate?: string
  newStartTime?: string
  newEndTime?: string
  newTitle?: string
  approvals: SharedEventApproval[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'STUCK'
}

export interface SharedEventGroup {
  id: string
  title: string
  linkedTrainingIds: string[]
  createdByTrainingId: string
  createdByUserId: string
  status: SharedGroupStatus
  approvals: SharedEventApproval[]
  currentEventIdsByTrainingId: Record<string, string>
  pendingChangeRequestIds: string[]
}
