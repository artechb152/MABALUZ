import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScheduleEvent } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Icon } from '@/assets/icons/Icon'
import { buttons, dashboards, emptyStates, nav } from '@/lib/hebrewCopy'
import {
  useCurrentUser,
  useDraftSchedule,
  usePublishedSchedule,
  useSelectedTraining
} from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { addDaysISO, todayISO } from '@/lib/time'
import { detectConflicts } from '@/features/scheduling-engine'
import { EventRow, SectionCard, StatCard } from './widgets'
import { dashCopy } from './copy'

export function CommanderDashboard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const published = usePublishedSchedule(training)
  const { changeRequests, lecturers } = useDb()

  const today = todayISO()
  const weekAhead = addDaysISO(today, 7)

  const conflicts = useMemo(() => {
    if (!training || !draft) return []
    return detectConflicts({
      events: draft.events,
      training,
      settings: training.settings,
      lecturers,
      lockedDates: draft.lockedDates
    })
  }, [training, draft, lecturers])

  const diverged = useMemo(() => {
    if (!draft || !published) return false
    const key = (e: ScheduleEvent) => `${e.title}|${e.date}|${e.startTime}|${e.endTime}`
    return (
      draft.events.length !== published.events.length ||
      draft.events.map(key).sort().join() !== published.events.map(key).sort().join()
    )
  }, [draft, published])

  const pendingApprovals = useMemo(
    () =>
      changeRequests.filter(
        (r) =>
          r.status === 'PENDING' &&
          r.approvals.some((a) => a.commanderId === user?.id && a.status === 'PENDING')
      ),
    [changeRequests, user]
  )

  const upcomingGuestLectures = useMemo(
    () =>
      (draft?.events ?? [])
        .filter((e) => e.type === 'GUEST_LECTURE' && e.date >= today && e.date <= weekAhead)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [draft, today, weekAhead]
  )

  const nextHardEvents = useMemo(
    () =>
      (draft?.events ?? [])
        .filter((e) => e.isLocked && e.date >= today)
        .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
        .slice(0, 5),
    [draft, today]
  )

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.dashboard} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={user ? dashCopy.hello(user.firstName) : nav.dashboard}
        subtitle={`${dashboards.currentTraining}: ${training.name}`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={dashboards.draftStatus}
          value={diverged ? dashCopy.draftDiverged : dashCopy.draftSynced}
          icon="draft"
          tone={diverged ? 'warning' : 'success'}
          onClick={() => navigate('/schedule')}
        />
        <StatCard
          label={dashboards.openConflicts}
          value={conflicts.length}
          icon="conflict"
          tone={conflicts.some((c) => c.severity === 'BLOCKING') ? 'danger' : conflicts.length > 0 ? 'warning' : 'success'}
          onClick={() => navigate('/conflicts')}
        />
        <StatCard
          label={dashCopy.pendingMyApproval}
          value={pendingApprovals.length}
          icon="shared-schedule"
          tone={pendingApprovals.length > 0 ? 'warning' : 'neutral'}
          onClick={() => navigate('/shared')}
        />
        <StatCard
          label={dashboards.guestLecturesNext7Days}
          value={upcomingGuestLectures.length}
          icon="guest-lecturer"
          tone="primary"
          onClick={() => navigate('/lecturers')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title={dashboards.nextHardEvents}>
            <div className="space-y-2">
              {nextHardEvents.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-muted">{dashCopy.noHardEvents}</p>
              ) : (
                nextHardEvents.map((e) => <EventRow key={e.id} event={e} />)
              )}
            </div>
          </SectionCard>

          {upcomingGuestLectures.length > 0 ? (
            <div className="mt-4">
              <SectionCard title={dashboards.guestLecturesNext7Days}>
                <div className="space-y-2">
                  {upcomingGuestLectures.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}
        </div>

        <SectionCard title={dashboards.quickActions}>
          <div className="grid gap-2">
            <QuickAction icon="calendar" label={nav.scheduleBuilder} onClick={() => navigate('/schedule')} />
            <QuickAction icon="plus" label={buttons.addEvent} onClick={() => navigate('/schedule')} />
            <QuickAction icon="peak-day" label={buttons.addPeakDay} onClick={() => navigate('/peak-days')} />
            <QuickAction icon="guest-lecturer" label={buttons.addGuestLecture} onClick={() => navigate('/lecturers')} />
            <QuickAction icon="excel-import" label={buttons.importExcel} onClick={() => navigate('/import')} />
            <QuickAction icon="publish" label={buttons.publish} onClick={() => navigate('/schedule')} />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function QuickAction(props: { icon: Parameters<typeof Icon>[0]['name']; label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" className="justify-start" onClick={props.onClick}>
      <Icon name={props.icon} size={16} />
      {props.label}
    </Button>
  )
}
