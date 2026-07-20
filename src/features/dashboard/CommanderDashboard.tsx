import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { buttons, confirmationStatusLabels, conflictSeverityLabels, emptyStates, nav } from '@/lib/hebrewCopy'
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
import { decideOnChange } from '@/data/services/sharedEventService'
import type { ConflictSeverity, LectureConfirmationStatus, ScheduleEvent } from '@/types'
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
  const lectureDetails = useDb((s) => s.guestLectureDetails)
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

  const blocking = conflicts.filter((c) => c.severity === 'BLOCKING').length
  const warning = conflicts.length - blocking

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

      {/* Today (hero, right) + the panels (left). */}
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
        {/* Today's published schedule — plain white card. */}
        <section className="relative flex min-h-0 flex-col rounded-2xl border border-line bg-panel-solid p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/schedule')}
              className="focus-ring flex items-center gap-1.5 text-start transition-colors hover:text-primary-hover"
            >
              <h2 className="t-display text-[22px]">{dashCopy.todaySchedule}</h2>
              <span className="text-[18px] leading-none text-primary-hover">‹</span>
            </button>
            <InfoTip text={dashCopy.infoToday} />
          </header>
          <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-2">
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

        {/* Left column — requests / conflicts+draft / lectures. */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* Requests to accept — same size as lectures. */}
          <DashCard
            title={dashCopy.commanderRequests}
            info={dashCopy.infoRequests}
            onTitleClick={() => navigate('/shared')}
            center
            className="flex-1"
          >
            {pendingRequests.length === 0 ? (
              <Empty text={dashCopy.noRequests} />
            ) : (
              pendingRequests.map((r) => {
                const from = trainings.find((t) => t.id === r.requestedByTrainingId)?.name ?? ''
                const mine = r.approvals.find((a) => a.commanderId === user?.id && a.status === 'PENDING')
                return (
                  <div key={r.id} className="text-center">
                    <span className="block text-[16px] font-medium text-ink">{r.description}</span>
                    {from ? <span className="block text-[14px] text-ink-muted">{from}</span> : null}
                    {mine ? (
                      <div className="mt-2 flex justify-center gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => void decideOnChange(r.id, mine.trainingId, 'APPROVED')}
                        >
                          {buttons.approveChange}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void decideOnChange(r.id, mine.trainingId, 'REJECTED')}
                        >
                          {buttons.rejectChange}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </DashCard>

          {/* Open conflicts (right, scrollable) + draft status (left third). */}
          <div className="card-tex flex min-h-0 flex-[2.5] overflow-hidden !p-0">
            <div className="flex min-h-0 flex-[2] flex-col p-5">
              <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/conflicts')}
                  className="focus-ring flex items-center gap-1.5 text-start text-[22px] font-semibold text-ink transition-colors hover:text-primary-hover"
                >
                  {dashCopy.openConflictsTitle}
                  <span className="text-[18px] leading-none text-primary-hover">‹</span>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <ConflictCount blocking={blocking} warning={warning} />
                  <InfoTip text={dashCopy.infoConflicts} />
                </div>
              </div>
              <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pe-1">
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

          {/* Closest lectures — same size as requests, with confirmation status. */}
          <DashCard
            title={dashCopy.closestLectures}
            info={dashCopy.infoLectures}
            onTitleClick={() => navigate('/lecturers')}
            center
            className="flex-1"
          >
            {lectures.length === 0 ? (
              <Empty text={emptyStates.noUpcomingLectures} />
            ) : (
              lectures.map((e) => {
                const details = lectureDetails.find((d) => d.eventId === e.id || `${d.eventId}-d` === e.id)
                return (
                  <div key={e.id} className="text-center">
                    <span className="block text-[16px] font-medium text-ink">{e.title}</span>
                    <span className="tnum block text-[14px] text-ink-muted" dir="ltr">
                      {formatDateHe(e.date)} · {e.startTime}
                    </span>
                    {details ? <StatusChip status={details.confirmationStatus} /> : null}
                  </div>
                )
              })
            )}
          </DashCard>
        </div>
      </div>
    </div>
  )
}

/** Info marker + hover tooltip explaining a card. */
function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex shrink-0">
      <span className="flex h-[18px] w-[18px] cursor-help items-center justify-center rounded-full border border-line bg-panel-solid text-[11px] font-bold leading-none text-ink-muted">
        ?
      </span>
      <span className="pointer-events-none absolute end-0 top-full z-40 mt-1.5 w-56 rounded-lg border border-line bg-white px-3 py-2 text-start text-[13px] font-normal leading-snug text-black opacity-0 shadow-md transition-opacity duration-150 group-hover/tip:opacity-100">
        {text}
      </span>
    </span>
  )
}

function DashCard(props: {
  title: string
  info: string
  onTitleClick?: () => void
  center?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={clsx('card-tex flex min-h-0 flex-col p-5', props.className)}>
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        {props.onTitleClick ? (
          <button
            type="button"
            onClick={props.onTitleClick}
            className="focus-ring flex items-center gap-1.5 text-start text-[22px] font-semibold text-ink transition-colors hover:text-primary-hover"
          >
            {props.title}
            <span className="text-[18px] leading-none text-primary-hover">‹</span>
          </button>
        ) : (
          <h2 className="text-[22px] font-semibold text-ink">{props.title}</h2>
        )}
        <InfoTip text={props.info} />
      </div>
      <div
        className={clsx(
          'no-scrollbar min-h-0 flex-1 overflow-y-auto',
          props.center ? 'flex flex-col justify-center gap-3' : 'space-y-2'
        )}
      >
        {props.children}
      </div>
    </div>
  )
}

function ConflictCount({ blocking, warning }: { blocking: number; warning: number }) {
  if (blocking + warning === 0) return null
  return (
    <div className="flex items-center gap-1.5 text-[13px] font-semibold">
      {blocking > 0 ? (
        <span className="rounded-md bg-danger-soft px-2 py-0.5 text-danger">
          {blocking} {dashCopy.conflictsBlocking}
        </span>
      ) : null}
      {warning > 0 ? (
        <span className="rounded-md bg-warning-soft px-2 py-0.5 text-warning">
          {warning} {dashCopy.conflictsWarning}
        </span>
      ) : null}
    </div>
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

function StatusChip({ status }: { status: LectureConfirmationStatus }) {
  const cls =
    status === 'CONFIRMED'
      ? 'bg-success-soft text-success'
      : status === 'REMINDER_SENT'
        ? 'bg-primary-soft text-primary-hover'
        : status === 'CANCELLED'
          ? 'bg-danger-soft text-danger'
          : 'bg-neutral-block text-ink-muted'
  return (
    <span className={clsx('mt-1 inline-block rounded-md px-2 py-0.5 text-[12px] font-medium', cls)}>
      {confirmationStatusLabels[status]}
    </span>
  )
}
