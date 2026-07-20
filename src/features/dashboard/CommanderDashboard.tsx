import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { buttons, conflictSeverityLabels, emptyStates, nav } from '@/lib/hebrewCopy'
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

  const peakDays = useMemo(
    () =>
      (draft?.events ?? [])
        .filter((e) => e.type === 'PEAK_DAY' && e.date >= today && e.date <= weekAhead)
        .sort((a, b) => a.date.localeCompare(b.date))
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
    // Fills the viewport: the page never scrolls, the columns/cards do.
    <div className="flex h-full flex-col">
      {/* Greeting + training name; soldier-view toggle on the left. */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="t-display">{user ? dashCopy.hello(user.firstName) : nav.dashboard}</h1>
          <p className="mt-1 text-[18px] font-medium text-ink-muted">{training.name}</p>
        </div>
        {/* White by default; grey on hover (like the sidebar), indigo when pressed. */}
        <button
          type="button"
          onClick={() => setSoldierPreview(true)}
          className="focus-ring rounded-xl border border-line bg-panel-solid px-4 py-2 text-[15px] font-medium text-ink-muted shadow-sm transition-colors hover:bg-neutral-block hover:text-ink active:bg-primary-soft active:text-primary-hover"
        >
          {buttons.soldierPreview}
        </button>
      </div>

      {/* Today (hero, right) + the panels (left) — fills the whole height. */}
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

        {/* Left column — cards flex to fill the height. */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Requests to accept — a touch larger, centred. */}
          <PanelCard
            title={dashCopy.commanderRequests}
            count={pendingRequests.length}
            footerLabel={dashCopy.toShared}
            onFooter={pendingRequests.length > 0 ? () => navigate('/shared') : undefined}
            center
            className="flex-[1.2]"
          >
            {pendingRequests.length === 0 ? (
              <Empty text={dashCopy.noRequests} />
            ) : (
              pendingRequests.map((r) => {
                const from = trainings.find((t) => t.id === r.requestedByTrainingId)?.name ?? ''
                return (
                  <div key={r.id} className="text-center">
                    <span className="block text-[16px] font-medium text-ink">{r.description}</span>
                    {from ? <span className="text-[14px] text-ink-muted">{from}</span> : null}
                  </div>
                )
              })
            )}
          </PanelCard>

          {/* Open conflicts (right, scrollable) + draft status (left third). */}
          <div className="card-tex flex min-h-0 flex-[1.6] overflow-hidden !p-0">
            <div className="flex min-h-0 flex-[2] flex-col p-5">
              <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                <h2 className="text-[22px] font-semibold text-ink">{dashCopy.openConflictsTitle}</h2>
                {conflicts.length > 0 ? <CountBadge value={conflicts.length} /> : null}
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pe-1">
                {conflicts.length === 0 ? (
                  <Empty text={dashCopy.noOpenConflicts} />
                ) : (
                  conflicts.map((c) => (
                    <ListItem key={c.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[16px] font-medium text-ink">{c.title}</span>
                        <SeverityChip severity={c.severity} />
                      </div>
                      {c.description ? <span className="text-[14px] text-ink-muted">{c.description}</span> : null}
                    </ListItem>
                  ))
                )}
              </div>
              {conflicts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => navigate('/conflicts')}
                  className="focus-ring mt-3 shrink-0 self-start rounded text-[14px] font-medium text-primary-hover hover:underline"
                >
                  {dashCopy.toConflicts}
                </button>
              ) : null}
            </div>

            {/* Draft status — a third, on the left, centred. */}
            <div className="flex flex-1 flex-col items-center justify-center gap-2 border-s border-line p-4 text-center">
              <span className="text-[16px] font-semibold text-ink">{dashCopy.draftStatusTitle}</span>
              <span className={clsx('text-[15px] font-medium', diverged ? 'text-warning' : 'text-success')}>
                {diverged ? dashCopy.draftDiverged : dashCopy.draftPublished}
              </span>
              {diverged ? (
                <Button variant="publish" size="sm" onClick={() => navigate('/schedule')}>
                  {buttons.publish}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Closest lectures — centred. */}
          <PanelCard
            title={dashCopy.closestLectures}
            footerLabel={nav.guestLecturers}
            onFooter={() => navigate('/lecturers')}
            center
            className="flex-1"
          >
            {lectures.length === 0 ? (
              <Empty text={emptyStates.noUpcomingLectures} />
            ) : (
              lectures.map((e) => (
                <div key={e.id} className="text-center">
                  <span className="block text-[16px] font-medium text-ink">{e.title}</span>
                  <span className="tnum text-[14px] text-ink-muted" dir="ltr">
                    {formatDateHe(e.date)} · {e.startTime}
                  </span>
                </div>
              ))
            )}
          </PanelCard>

          {/* Upcoming peak days — centred. */}
          <PanelCard
            title={dashCopy.upcomingPeakDays}
            count={peakDays.length}
            footerLabel={nav.peakDays}
            onFooter={() => navigate('/peak-days')}
            center
            className="flex-1"
          >
            {peakDays.length === 0 ? (
              <Empty text={dashCopy.noPeakDays} />
            ) : (
              peakDays.map((e) => (
                <div key={e.id} className="text-center">
                  <span className="block text-[16px] font-medium text-ink">{e.title}</span>
                  <span className="tnum text-[14px] text-ink-muted" dir="ltr">
                    {formatDateHe(e.date)}
                  </span>
                </div>
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
  center?: boolean
  className?: string
}) {
  return (
    <div className={clsx('card-tex flex min-h-0 flex-col p-5', props.className)}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-[22px] font-semibold text-ink">{props.title}</h2>
        {typeof props.count === 'number' && props.count > 0 ? <CountBadge value={props.count} /> : null}
      </div>
      <div
        className={clsx(
          'min-h-0 flex-1 overflow-y-auto',
          props.center ? 'flex flex-col justify-center gap-2.5' : 'space-y-2'
        )}
      >
        {props.children}
      </div>
      {props.footerLabel && props.onFooter ? (
        <button
          type="button"
          onClick={props.onFooter}
          className="focus-ring mt-3 shrink-0 self-start rounded text-[14px] font-medium text-primary-hover hover:underline"
        >
          {props.footerLabel}
        </button>
      ) : null}
    </div>
  )
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-[14px] font-semibold text-primary-hover">
      {value}
    </span>
  )
}

function ListItem({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-panel-solid px-3 py-2">{children}</div>
}

function Empty({ text }: { text: string }) {
  return <p className="t-body text-center text-ink-muted">{text}</p>
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
