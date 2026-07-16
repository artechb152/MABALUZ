import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Training } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Icon } from '@/assets/icons/Icon'
import { buttons, dashboards, emptyStates, nav, trainingStatusLabels } from '@/lib/hebrewCopy'
import { useCurrentUser, useMyTrainings } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { useUi } from '@/app/uiStore'
import { addDaysISO, daysBetween, formatDateHe, todayISO } from '@/lib/time'
import { detectConflicts } from '@/features/scheduling-engine'
import { StatCard } from './widgets'
import { dashCopy } from './copy'

export function SeniorDashboard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const myTrainings = useMyTrainings()
  const { schedules, changeRequests, users, lecturers } = useDb()
  const setSelectedTraining = useUi((s) => s.setSelectedTraining)

  const today = todayISO()
  const weekAhead = addDaysISO(today, 7)

  const perTraining = useMemo(
    () =>
      myTrainings.map((t) => {
        const draft = schedules.find((s) => s.id === t.draftScheduleId)
        const conflicts = draft
          ? detectConflicts({
              events: draft.events,
              training: t,
              settings: t.settings,
              lecturers,
              lockedDates: draft.lockedDates
            })
          : []
        const pending = changeRequests.filter(
          (r) => r.status === 'PENDING' && r.approvals.some((a) => a.trainingId === t.id && a.status === 'PENDING')
        )
        const nextLecture = (draft?.events ?? [])
          .filter((e) => e.type === 'GUEST_LECTURE' && e.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0]
        const commander = users.find((u) => u.id === t.commanderId)
        return { training: t, conflicts, pending, nextLecture, commander }
      }),
    [myTrainings, schedules, changeRequests, users, lecturers, today]
  )

  const totals = useMemo(
    () => ({
      active: myTrainings.filter((t) => t.status === 'ACTIVE').length,
      pending: perTraining.reduce((s, x) => s + x.pending.length, 0),
      conflicts: perTraining.reduce((s, x) => s + x.conflicts.length, 0),
      lectures: perTraining.filter((x) => x.nextLecture && x.nextLecture.date <= weekAhead).length
    }),
    [myTrainings, perTraining, weekAhead]
  )

  function enter(training: Training) {
    setSelectedTraining(training.id)
    navigate('/schedule')
  }

  return (
    <div>
      <PageHeader
        title={user ? dashCopy.hello(user.firstName) : nav.dashboard}
        subtitle={dashboards.myTrainings}
        actions={
          <Button onClick={() => navigate('/trainings/new')}>
            <Icon name="plus" size={16} />
            {buttons.createTraining}
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={dashboards.activeTrainings} value={totals.active} icon="training" tone="primary" />
        <StatCard
          label={dashboards.pendingApprovals}
          value={totals.pending}
          icon="shared-schedule"
          tone={totals.pending > 0 ? 'warning' : 'neutral'}
          onClick={() => navigate('/shared')}
        />
        <StatCard
          label={dashboards.openConflicts}
          value={totals.conflicts}
          icon="conflict"
          tone={totals.conflicts > 0 ? 'danger' : 'success'}
        />
        <StatCard label={dashboards.upcomingLectures} value={totals.lectures} icon="guest-lecturer" tone="primary" />
      </div>

      {perTraining.length === 0 ? (
        <EmptyState message={emptyStates.noTrainings} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {perTraining.map(({ training, conflicts, pending, nextLecture, commander }) => {
            const startsSoon =
              training.status === 'PLANNING' && daysBetween(today, training.startDate) <= 14
            return (
              <div key={training.id} className="card-tex p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-ink">{training.name}</h2>
                    <p className="tnum mt-0.5 text-xs text-ink-muted">
                      {training.symbol} | {formatDateHe(training.startDate)} — {formatDateHe(training.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {startsSoon ? <Badge tone="primary">{dashboards.startingSoon}</Badge> : null}
                    <Badge tone={training.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {trainingStatusLabels[training.status]}
                    </Badge>
                  </div>
                </div>

                <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <InfoRow label={dashboards.myCommander} value={commander?.displayName ?? ''} />
                  <InfoRow
                    label={dashCopy.soldiersCount}
                    value={String(training.soldierIds.length + training.pendingSoldiers.length)}
                  />
                  <InfoRow
                    label={dashboards.openConflicts}
                    value={String(conflicts.length)}
                    tone={conflicts.length > 0 ? 'warning' : undefined}
                  />
                  <InfoRow
                    label={dashboards.pendingApprovals}
                    value={String(pending.length)}
                    tone={pending.length > 0 ? 'warning' : undefined}
                  />
                  {nextLecture ? (
                    <InfoRow
                      label={dashCopy.nextGuestLecture}
                      value={`${formatDateHe(nextLecture.date)} ${nextLecture.startTime}`}
                    />
                  ) : null}
                </dl>

                <Button variant="secondary" className="w-full" onClick={() => enter(training)}>
                  <Icon name="chevron-left" size={15} />
                  {dashCopy.enterTraining}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={tone === 'warning' ? 'tnum font-semibold text-warning' : 'tnum font-medium text-ink'}>
        {value}
      </dd>
    </div>
  )
}
