import { useEffect, useMemo, useState } from 'react'
import type { SharedEventChangeRequest, SharedEventGroup } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Icon } from '@/assets/icons/Icon'
import {
  approvalStatusLabels,
  buttons,
  emptyStates,
  nav,
  sharedEvents,
  statusLabels
} from '@/lib/hebrewCopy'
import { useCurrentUser, useEffectiveRole, useSelectedTraining } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { decideOnChange, expireStaleRequests } from '@/data/services/sharedEventService'
import { formatDateHe } from '@/lib/time'
import { CreateSharedEventModal } from './CreateSharedEventModal'
import { ContactsModal } from './ContactsModal'
import { RequestChangeModal } from './RequestChangeModal'
import { sharedCopy } from './copy'

const groupStatusLabel: Record<SharedEventGroup['status'], { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  ACTIVE: { label: statusLabels.linked, tone: 'success' },
  UNSYNCED: { label: statusLabels.unsynced, tone: 'neutral' },
  PENDING_LINK_APPROVAL: { label: statusLabels.pendingApproval, tone: 'warning' },
  PENDING_CHANGE_APPROVAL: { label: statusLabels.pendingApproval, tone: 'warning' }
}

const requestStatusLabel: Record<SharedEventChangeRequest['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  PENDING: { label: approvalStatusLabels.PENDING, tone: 'warning' },
  APPROVED: { label: approvalStatusLabels.APPROVED, tone: 'success' },
  REJECTED: { label: approvalStatusLabels.REJECTED, tone: 'danger' },
  EXPIRED: { label: approvalStatusLabels.EXPIRED, tone: 'neutral' },
  STUCK: { label: statusLabels.stuckChange, tone: 'danger' }
}

export function SharedEventsPage() {
  const user = useCurrentUser()
  const role = useEffectiveRole()
  const training = useSelectedTraining()
  const { sharedGroups, changeRequests, trainings, users, schedules } = useDb()
  const [createOpen, setCreateOpen] = useState(false)
  const [contactsFor, setContactsFor] = useState<string | null>(null)
  const [changeFor, setChangeFor] = useState<SharedEventGroup | null>(null)

  useEffect(() => {
    void expireStaleRequests()
  }, [])

  const scopeAll = role === 'SENIOR_COMMANDER' || role === 'ADMIN'
  const visibleGroups = useMemo(
    () =>
      scopeAll || !training
        ? sharedGroups
        : sharedGroups.filter((g) => g.linkedTrainingIds.includes(training.id)),
    [sharedGroups, scopeAll, training]
  )

  const visibleRequests = useMemo(
    () =>
      changeRequests.filter((r) => {
        const group = sharedGroups.find((g) => g.id === r.groupId)
        if (!group) return false
        if (scopeAll) return true
        return training ? group.linkedTrainingIds.includes(training.id) : false
      }),
    [changeRequests, sharedGroups, scopeAll, training]
  )

  function trainingName(id: string): string {
    return trainings.find((t) => t.id === id)?.name ?? id
  }

  function groupEventInfo(group: SharedEventGroup): string | null {
    const anyEventId = Object.values(group.currentEventIdsByTrainingId)[0]
    const event = schedules.flatMap((s) => s.events).find((e) => e.id === anyEventId || e.id === `${anyEventId}-d`)
    if (!event) return null
    return `${formatDateHe(event.date)} | ${event.startTime}-${event.endTime}`
  }

  return (
    <div>
      <PageHeader
        title={nav.sharedSchedules}
        subtitle={training?.name}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={16} />
            {buttons.addShared}
          </Button>
        }
      />

      {/* Groups */}
      {visibleGroups.length === 0 ? (
        <EmptyState message={emptyStates.noSharedSchedules} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleGroups.map((group) => {
            const status = groupStatusLabel[group.status]
            const info = groupEventInfo(group)
            return (
              <div key={group.id} className="card-tex p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon name="shared-schedule" size={18} className="text-primary" />
                    <h2 className="text-base font-semibold text-ink">{group.title}</h2>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                {info ? <p className="tnum mb-2 text-sm text-ink-muted">{info}</p> : null}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {group.linkedTrainingIds.map((tid) => (
                    <Badge key={tid} tone="primary">
                      {trainingName(tid)}
                    </Badge>
                  ))}
                </div>
                <div className="mb-3 space-y-1">
                  {group.approvals.map((a) => {
                    const commander = users.find((u) => u.id === a.commanderId)
                    return (
                      <div key={a.trainingId} className="flex items-center gap-2 text-xs">
                        <Badge
                          tone={a.status === 'APPROVED' ? 'success' : a.status === 'REJECTED' ? 'danger' : 'warning'}
                        >
                          {approvalStatusLabels[a.status]}
                        </Badge>
                        <span className="text-ink">{commander?.displayName}</span>
                        <span className="text-ink-muted">({trainingName(a.trainingId)})</span>
                      </div>
                    )
                  })}
                </div>
                {group.status === 'UNSYNCED' ? (
                  <p className="mb-2 text-xs text-ink-muted">{sharedEvents.linkLater}</p>
                ) : null}
                {group.status === 'ACTIVE' && role !== 'SOLDIER' ? (
                  <Button variant="secondary" size="sm" onClick={() => setChangeFor(group)}>
                    {sharedCopy.requestChange}
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Change requests */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-ink">{sharedEvents.pendingRequests}</h2>
      {visibleRequests.length === 0 ? (
        <EmptyState message={sharedCopy.noRequests} />
      ) : (
        <div className="space-y-3">
          {visibleRequests.map((request) => {
            const status = requestStatusLabel[request.status]
            const requester = users.find((u) => u.id === request.requestedByUserId)
            const myApproval = request.approvals.find(
              (a) => a.commanderId === user?.id && a.status === 'PENDING'
            )
            return (
              <div key={request.id} className="card-tex p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span className="text-sm font-semibold text-ink">{request.description}</span>
                    </div>
                    <p className="tnum mt-1 text-xs text-ink-muted">
                      {sharedCopy.requestedBy(requester?.displayName ?? '')}
                      {request.newDate
                        ? ` | ${sharedCopy.proposedTime}: ${formatDateHe(request.newDate)} ${request.newStartTime ?? ''}-${request.newEndTime ?? ''}`
                        : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {request.approvals.map((a) => {
                        const commander = users.find((u) => u.id === a.commanderId)
                        return (
                          <span key={a.trainingId} className="flex items-center gap-1.5 text-xs">
                            <Badge
                              tone={
                                a.status === 'APPROVED' ? 'success' : a.status === 'REJECTED' ? 'danger' : 'warning'
                              }
                            >
                              {approvalStatusLabels[a.status]}
                            </Badge>
                            <span className="text-ink-muted">{commander?.displayName}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {myApproval && request.status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => training && void decideOnChange(request.id, myApproval.trainingId, 'APPROVED')}
                        >
                          {buttons.approveChange}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => training && void decideOnChange(request.id, myApproval.trainingId, 'REJECTED')}
                        >
                          {buttons.rejectChange}
                        </Button>
                      </div>
                    ) : null}
                    {request.status === 'PENDING' || request.status === 'STUCK' ? (
                      <Button variant="ghost" size="sm" onClick={() => setContactsFor(request.id)}>
                        <Icon name="phone" size={14} />
                        {buttons.showContactDetails}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {request.status === 'PENDING' ? (
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-warning-soft px-4 py-2.5 text-xs text-warning">
                    {sharedEvents.pendingAllApprovals}
                  </p>
                ) : null}
                {request.status === 'STUCK' ? (
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-danger-soft px-4 py-2.5 text-xs text-danger">
                    {sharedEvents.stuck}
                  </p>
                ) : null}
                {request.status === 'APPROVED' ? (
                  <p className="mt-3 rounded-xl bg-success-soft px-4 py-2.5 text-xs text-success">
                    {sharedCopy.appliedToDrafts}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <CreateSharedEventModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ContactsModal requestId={contactsFor} onClose={() => setContactsFor(null)} />
      {changeFor ? (
        <RequestChangeModal group={changeFor} onClose={() => setChangeFor(null)} />
      ) : null}
    </div>
  )
}
