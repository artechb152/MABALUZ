import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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

// Shared "chrome" button: same look as the soldier-view toggle (white, grey on
// hover, indigo when pressed). Reused so those buttons stay pixel-identical.
const chromeButtonClass =
  'focus-ring rounded-xl border border-line bg-panel-solid px-4 py-2 text-[15px] font-medium text-ink-muted shadow-sm transition-colors hover:bg-neutral-block hover:text-ink active:bg-primary-soft active:text-primary-hover'

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
        <button type="button" onClick={() => setSoldierPreview(true)} className={chromeButtonClass}>
          {buttons.soldierPreview}
        </button>
      </div>

      {/* Today (hero, right) + the panels (left). */}
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
        {/* Today's published schedule — plain white card. */}
        <section className="relative flex min-h-0 flex-col rounded-2xl border border-line bg-panel-solid p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between gap-2">
            <h2 className="t-display text-[22px]">{dashCopy.todaySchedule}</h2>
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

        {/* Left column — requests / conflicts+draft / lectures. Cards keep a
            min-height that fits their content (never clipped); the column
            scrolls if the viewport is too short to grow them all. */}
        <div className="no-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto">
          {/* Requests to accept — centred, same size as lectures. */}
          <DashCard title={dashCopy.commanderRequests} info={dashCopy.infoRequests} className="min-h-[190px] flex-1">
            {pendingRequests.length === 0 ? (
              <Centered>
                <Empty text={dashCopy.noRequests} />
              </Centered>
            ) : (
              // Scroll container + auto margins: the block centres when it fits and
              // stays fully reachable (no clipped top) when it does not.
              <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="my-auto flex w-full flex-col items-center gap-4 px-2 py-1">
                  {pendingRequests.map((r) => {
                    const from = trainings.find((t) => t.id === r.requestedByTrainingId)?.name ?? ''
                    const mine = r.approvals.find((a) => a.commanderId === user?.id && a.status === 'PENDING')
                    return (
                      <div key={r.id} className="w-full max-w-sm text-center">
                        <span className="block text-[16px] font-medium leading-snug text-ink">{r.description}</span>
                        {from ? <span className="mt-1 block text-[13px] text-ink-muted">{from}</span> : null}
                        {mine ? (
                          <div className="mt-3 flex flex-wrap justify-center gap-2">
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
                  })}
                </div>
              </div>
            )}
          </DashCard>

          {/* Open conflicts (swipe deck) + draft-status inset panel. */}
          <div className="card-tex flex min-h-[248px] flex-[1.6] flex-col p-5">
            <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
              <h2 className="text-[22px] font-semibold text-ink">{dashCopy.openConflictsTitle}</h2>
              <InfoTip text={dashCopy.infoConflicts} />
            </div>
            <div className="flex min-h-0 flex-1 gap-4">
              {/* Conflicts — one at a time, swipeable (right). */}
              <div className="flex min-h-0 flex-[2] flex-col">
                {conflicts.length === 0 ? (
                  <Centered>
                    <Empty text={dashCopy.noOpenConflicts} />
                  </Centered>
                ) : (
                  <SwipeDeck
                    items={conflicts}
                    renderItem={(c) => (
                      <>
                        <div className="mb-1.5 flex flex-wrap items-center justify-center gap-2">
                          <span className="text-[17px] font-medium text-ink">{c.title}</span>
                          <SeverityChip severity={c.severity} />
                        </div>
                        {c.description ? (
                          <p className="mx-auto max-w-md text-[14px] leading-relaxed text-ink-muted">{c.description}</p>
                        ) : null}
                      </>
                    )}
                  />
                )}
              </div>

              {/* Draft status — an inset panel, split off by a gap (no hard divider). */}
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-neutral-block/60 p-4 text-center">
                <span className="text-[15px] font-semibold text-ink">{dashCopy.draftStatusTitle}</span>
                <span
                  className={clsx(
                    'rounded-full px-3 py-1 text-[13px] font-medium',
                    diverged ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
                  )}
                >
                  {diverged ? dashCopy.draftDiverged : dashCopy.draftPublished}
                </span>
                {diverged ? (
                  <button type="button" onClick={() => navigate('/schedule')} className={chromeButtonClass}>
                    {dashCopy.viewChanges}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Closest lectures — one at a time, swipeable, with confirmation status. */}
          <DashCard title={dashCopy.closestLectures} info={dashCopy.infoLectures} className="min-h-[176px] flex-1">
            {lectures.length === 0 ? (
              <Centered>
                <Empty text={emptyStates.noUpcomingLectures} />
              </Centered>
            ) : (
              <SwipeDeck
                items={lectures}
                renderItem={(e) => {
                  const details = lectureDetails.find((d) => d.eventId === e.id || `${d.eventId}-d` === e.id)
                  return (
                    <div className="flex flex-col items-center">
                      <span className="text-[17px] font-medium text-ink">{e.title}</span>
                      <span className="tnum mt-1 text-[14px] text-ink-muted" dir="ltr">
                        {formatDateHe(e.date)} · {e.startTime}
                      </span>
                      {details ? <StatusChip status={details.confirmationStatus} /> : null}
                    </div>
                  )
                }}
              />
            )}
          </DashCard>
        </div>
      </div>
    </div>
  )
}

/**
 * Info marker + hover tooltip explaining a card. Rendered through a portal at a
 * fixed position so it sits on the very top layer and is never clipped by a
 * card's rounded/overflow-hidden bounds.
 */
function InfoTip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = () => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = 240
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    setPos({ top: r.bottom + 8, left })
  }
  const hide = () => setPos(null)

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      className="group/tip focus-ring inline-flex shrink-0 rounded-full"
    >
      <span className="flex h-[18px] w-[18px] cursor-help items-center justify-center rounded-full border border-line bg-panel-solid text-[11px] font-bold leading-none text-ink-muted transition-colors group-hover/tip:border-primary/40 group-hover/tip:bg-primary-soft group-hover/tip:text-primary-hover">
        ?
      </span>
      {pos
        ? createPortal(
            <span
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: 240,
                zIndex: 9999,
                animation: 'fadeSlideIn 0.14s ease'
              }}
              className="pointer-events-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-start text-[13px] font-normal leading-relaxed text-black shadow-lg"
            >
              {text}
            </span>,
            document.body
          )
        : null}
    </span>
  )
}

function DashCard(props: { title: string; info: string; className?: string; children: ReactNode }) {
  return (
    <div className={clsx('card-tex flex flex-col p-5', props.className)}>
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <h2 className="text-[22px] font-semibold text-ink">{props.title}</h2>
        <InfoTip text={props.info} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{props.children}</div>
    </div>
  )
}

/**
 * Single-item deck: shows one entry; drag it or use the side buttons to page.
 * In RTL the left control (and a leftward drag) go forward to the next item;
 * the right control goes back. Each swap slides in from the side opposite the
 * one it left toward, so paging reads like items running along a rail. The drag
 * has velocity flicks, rubber-band resistance at the ends, and a spring settle.
 */
function SwipeDeck<T>({ items, renderItem }: { items: T[]; renderItem: (item: T) => ReactNode }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const startX = useRef<number | null>(null)
  const lastX = useRef(0)
  const lastT = useRef(0)
  const velocity = useRef(0)

  const count = items.length
  const clamped = count === 0 ? 0 : Math.min(index, count - 1)
  const atStart = clamped === 0
  const atEnd = clamped === count - 1

  // dir: +1 = forward (to a later item), -1 = back.
  const go = useCallback(
    (d: number) => {
      setDir(d)
      setSnapping(false)
      setDragX(0)
      setIndex((i) => Math.min(Math.max(0, Math.min(i, count - 1) + d), count - 1))
    },
    [count]
  )

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (count < 2) return
    startX.current = e.clientX
    lastX.current = e.clientX
    lastT.current = e.timeStamp
    velocity.current = 0
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return
    setDragX(e.clientX - startX.current)
    const dt = e.timeStamp - lastT.current
    if (dt > 0) velocity.current = (e.clientX - lastX.current) / dt
    lastX.current = e.clientX
    lastT.current = e.timeStamp
  }
  const onUp = () => {
    if (startX.current === null) return
    const dx = dragX
    const v = velocity.current
    startX.current = null
    setDragging(false)
    const flick = Math.abs(v) > 0.4
    if (Math.abs(dx) > 8 && (Math.abs(dx) > 56 || flick)) {
      go((flick ? v : dx) < 0 ? 1 : -1) // leftward -> forward (next)
    } else {
      // Did not cross the threshold: spring back to centre.
      setSnapping(true)
      setDragX(0)
    }
  }

  // Resist dragging past the first/last item so the ends feel bounded.
  const blocked = (dragX < 0 && atEnd) || (dragX > 0 && atStart)
  const resisted = blocked ? dragX * 0.3 : dragX
  // Forward enters from the right (opposite the leftward exit); back from the left.
  const enter = dir >= 0 ? 'deckInRight' : 'deckInLeft'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-stretch gap-2">
        {count > 1 ? <DeckButton chevron="›" disabled={atStart} onClick={() => go(-1)} /> : null}
        <div
          className={clsx(
            'relative flex min-h-0 flex-1 items-center justify-center overflow-hidden',
            count > 1 && 'cursor-grab touch-none select-none active:cursor-grabbing'
          )}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div
            className="w-full px-2 text-center"
            style={{
              transform: `translateX(${resisted}px) scale(${dragging ? 0.985 : 1})`,
              transition: dragging || !snapping ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
              opacity: 1 - Math.min(Math.abs(resisted) / 340, 0.4),
              willChange: 'transform'
            }}
          >
            <div key={clamped} style={{ animation: `${enter} 0.3s cubic-bezier(0.22, 1, 0.36, 1)` }}>
              {renderItem(items[clamped])}
            </div>
          </div>
        </div>
        {count > 1 ? <DeckButton chevron="‹" disabled={atEnd} onClick={() => go(1)} /> : null}
      </div>
      {count > 1 ? (
        <div className="mt-2 flex shrink-0 items-center justify-center">
          <span
            className="tnum rounded-full bg-neutral-block px-2.5 py-0.5 text-[12px] font-semibold text-ink-muted"
            dir="ltr"
          >
            {clamped + 1} / {count}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function DeckButton({ chevron, disabled, onClick }: { chevron: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="week-nav-btn shrink-0 self-center text-[17px] leading-none"
    >
      {chevron}
    </button>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center">{children}</div>
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
    <span className={clsx('mt-2 inline-block rounded-md px-2 py-0.5 text-[12px] font-medium', cls)}>
      {confirmationStatusLabels[status]}
    </span>
  )
}
