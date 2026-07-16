import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { buttons, conflictSeverityLabels, dashboards, emptyStates, nav } from '@/lib/hebrewCopy'
import {
  useCurrentUser,
  useDraftSchedule,
  usePublishedSchedule,
  useSelectedTraining
} from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { useNow } from '@/app/useNow'
import { useSession } from '@/app/sessionStore'
import { addDaysISO, formatDateHe, todayISO, toMinutes } from '@/lib/time'
import { detectConflicts } from '@/features/scheduling-engine'
import type { ConflictSeverity, ScheduleEvent } from '@/types'
import { TodayBlock } from './TodayBlock'
import { dashCopy } from './copy'

export function CommanderDashboard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const training = useSelectedTraining()
  const published = usePublishedSchedule(training)
  const draft = useDraftSchedule(training)
  const changeRequests = useDb((s) => s.changeRequests)
  const lecturers = useDb((s) => s.lecturers)
  const trainings = useDb((s) => s.trainings)
  const setSoldierPreview = useSession((s) => s.setSoldierPreview)
  const now = useNow()

  const today = todayISO()
  const weekAhead = addDaysISO(today, 7)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

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

  const todayEvents = useMemo(
    () =>
      (published?.events ?? [])
        .filter((e) => e.date === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [published, today]
  )

  const lectures = useMemo(
    () =>
      (draft?.events ?? [])
        .filter((e) => e.type === 'GUEST_LECTURE' && e.date >= today && e.date <= weekAhead)
        .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
        .slice(0, 5),
    [draft, today, weekAhead]
  )

  const pendingRequests = useMemo(
    () =>
      changeRequests.filter(
        (r) =>
          r.status === 'PENDING' &&
          r.approvals.some((a) => a.commanderId === user?.id && a.status === 'PENDING')
      ),
    [changeRequests, user]
  )

  const diverged = useMemo(() => {
    if (!draft || !published) return false
    const key = (e: ScheduleEvent) => `${e.title}|${e.date}|${e.startTime}|${e.endTime}`
    return (
      draft.events.length !== published.events.length ||
      draft.events.map(key).sort().join() !== published.events.map(key).sort().join()
    )
  }, [draft, published])

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.dashboard} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  return (
    // Fills the viewport: the page never scrolls, the columns do.
    <div className="flex h-full flex-col">
      {/* Greeting + training/dates on the right; soldier-view button on the left. */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="t-display">{user ? dashCopy.hello(user.firstName) : nav.dashboard}</h1>
          <p className="mt-1 text-[16px] text-ink-muted">
            {dashboards.currentTraining}: <span className="font-medium text-ink">{training.name}</span>
            <span className="tnum" dir="ltr">
              {' · '}
              {formatDateHe(training.startDate)} — {formatDateHe(training.endDate)}
            </span>
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setSoldierPreview(true)}>
          {buttons.soldierPreview}
        </Button>
      </div>

      {/* Draft status + publish. */}
      <div
        className={clsx(
          'mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-card',
          diverged ? 'border-warning/30 bg-warning-soft' : 'border-line bg-panel-solid'
        )}
      >
        <div>
          <span className="block text-[16px] font-semibold text-ink">{dashCopy.draftStatusTitle}</span>
          <span className={clsx('text-[15px]', diverged ? 'text-warning' : 'text-ink-muted')}>
            {diverged ? dashCopy.draftDiverged : dashCopy.draftSynced}
          </span>
        </div>
        {diverged ? (
          <Button variant="publish" size="sm" onClick={() => navigate('/schedule')}>
            {buttons.publish}
          </Button>
        ) : null}
      </div>

      {/* Today (hero, right) + the panels (left). */}
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
        {/* Today's published schedule — plain white card. */}
        <section className="relative flex min-h-0 flex-col rounded-2xl border border-line bg-panel-solid p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between gap-2">
            <h2 className="t-display text-[22px]">{dashCopy.todaySchedule}</h2>
            <a
              href="#/schedule"
              className="focus-ring t-body rounded-lg px-2.5 py-1 font-medium text-primary-hover transition-colors hover:bg-primary-soft"
            >
              {dashCopy.fullScheduleShort}
            </a>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-2">
            {todayEvents.length === 0 ? (
              <p className="t-body py-10 text-center text-ink-muted">{dashCopy.nothingToday}</p>
            ) : (
              todayEvents.map((e) => (
                <TodayBlock
                  key={e.id}
                  event={e}
                  isNow={!e.isFullDay && nowMinutes >= toMinutes(e.startTime) && nowMinutes < toMinutes(e.endTime)}
                />
              ))
            )}
          </div>
        </section>

        {/* Left column: requests to resolve, open conflicts, closest lectures. */}
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pe-1">
          <PanelCard
            title={dashCopy.commanderRequests}
            count={pendingRequests.length}
            footerLabel={dashCopy.toShared}
            onFooter={pendingRequests.length > 0 ? () => navigate('/shared') : undefined}
          >
            {pendingRequests.length === 0 ? (
              <Empty text={dashCopy.noRequests} />
            ) : (
              pendingRequests.map((r) => {
                const from = trainings.find((t) => t.id === r.requestedByTrainingId)?.name ?? ''
                return (
                  <ListItem key={r.id}>
                    <span className="block text-[16px] font-medium text-ink">{r.description}</span>
                    {from ? <span className="text-[14px] text-ink-muted">{from}</span> : null}
                  </ListItem>
                )
              })
            )}
          </PanelCard>

          <PanelCard
            title={dashCopy.openConflictsTitle}
            count={conflicts.length}
            footerLabel={dashCopy.toConflicts}
            onFooter={conflicts.length > 0 ? () => navigate('/conflicts') : undefined}
          >
            {conflicts.length === 0 ? (
              <Empty text={dashCopy.noOpenConflicts} />
            ) : (
              conflicts.slice(0, 5).map((c) => (
                <ListItem key={c.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[16px] font-medium text-ink">{c.title}</span>
                    <SeverityChip severity={c.severity} />
                  </div>
                  {c.description ? <span className="text-[14px] text-ink-muted">{c.description}</span> : null}
                </ListItem>
              ))
            )}
          </PanelCard>

          <PanelCard title={dashCopy.closestLectures} footerLabel={nav.guestLecturers} onFooter={() => navigate('/lecturers')}>
            {lectures.length === 0 ? (
              <Empty text={emptyStates.noUpcomingLectures} />
            ) : (
              lectures.map((e) => (
                <ListItem key={e.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[16px] font-medium text-ink">{e.title}</span>
                    <span className="tnum shrink-0 text-[14px] text-ink-muted" dir="ltr">
                      {e.startTime}
                    </span>
                  </div>
                  <span className="tnum text-[14px] text-ink-muted">{formatDateHe(e.date)}</span>
                </ListItem>
              ))
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  )
}

function PanelCard(props: {
  title: string
  count?: number
  children: ReactNode
  footerLabel?: string
  onFooter?: () => void
}) {
  return (
    <div className="card-tex p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[22px] font-semibold text-ink">{props.title}</h2>
        {typeof props.count === 'number' && props.count > 0 ? (
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[14px] font-semibold text-primary-hover">
            {props.count}
          </span>
        ) : null}
      </div>
      <div className="space-y-2">{props.children}</div>
      {props.footerLabel && props.onFooter ? (
        <button
          type="button"
          onClick={props.onFooter}
          className="focus-ring mt-3 rounded text-[14px] font-medium text-primary-hover hover:underline"
        >
          {props.footerLabel}
        </button>
      ) : null}
    </div>
  )
}

function ListItem({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-panel-solid/80 px-3 py-2 backdrop-blur-sm">{children}</div>
}

function Empty({ text }: { text: string }) {
  return <p className="t-body py-3 text-center text-ink-muted">{text}</p>
}

function SeverityChip({ severity }: { severity: ConflictSeverity }) {
  const cls =
    severity === 'BLOCKING'
      ? 'bg-danger-soft text-danger'
      : severity === 'WARNING'
        ? 'bg-warning-soft text-warning'
        : 'bg-neutral-block text-ink-muted'
  return (
    <span className={clsx('shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium', cls)}>
      {conflictSeverityLabels[severity]}
    </span>
  )
}
