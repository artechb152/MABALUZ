import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/assets/icons/Icon'
import { confirmationStatusLabels, emptyStates, hebrewMonths, nav } from '@/lib/hebrewCopy'
import {
  useCurrentUser,
  useDraftSchedule,
  usePublishedSchedule,
  useSelectedTraining
} from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { useNow } from '@/app/useNow'
import { addDaysISO, todayISO, toMinutes } from '@/lib/time'
import { detectConflicts } from '@/features/scheduling-engine'
import type { LectureConfirmationStatus, ScheduleEvent } from '@/types'
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
  const lectureDetails = useDb((s) => s.guestLectureDetails)
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
  const warning = conflicts.filter((c) => c.severity === 'WARNING').length

  // Whole draft-status card: green = clean & published, orange = unpublished
  // changes, red = unresolved blocking conflicts.
  const draftState: 'ok' | 'unstaged' | 'blocked' =
    blocking > 0 ? 'blocked' : diverged ? 'unstaged' : 'ok'

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
      {/* Greeting + training name (soldier-view toggle now lives in the navbar). */}
      <div className="mb-4">
        <h1 className="t-display">{user ? dashCopy.hello(user.firstName) : nav.dashboard}</h1>
        <p className="mt-1 text-[18px] font-medium text-ink-muted">{training.name}</p>
      </div>

      {/* Today (hero, right) + the panels (left). */}
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
        {/* Today's published schedule — plain white card. */}
        <section className="relative flex min-h-0 flex-col rounded-2xl border border-line bg-panel-solid p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between gap-2">
            <h2 className="t-display text-[22px]">{dashCopy.todaySchedule}</h2>
            <InfoTip text={dashCopy.infoToday} />
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

        {/* Left column — requests / conflicts+draft / lectures. Cards keep a
            min-height that fits their content (never clipped); the column
            scrolls if the viewport is too short to grow them all. */}
        <div className="no-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto">
          {/* Requests to handle — a bounded summary that opens the confirmations
              screen. Content is fixed-size, so it is always fully visible. */}
          <DashCard
            title={dashCopy.commanderRequests}
            info={dashCopy.infoRequests}
            count={pendingRequests.length}
            className="min-h-[176px] flex-1"
          >
            <Centered>
              {pendingRequests.length === 0 ? (
                <Empty text={dashCopy.noRequests} />
              ) : (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 px-2 text-center">
                  <span className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">
                    {pendingRequests[0].description}
                  </span>
                  {pendingRequests.length > 1 ? (
                    <span className="text-[13px] text-ink-muted">
                      {dashCopy.morePending(pendingRequests.length - 1)}
                    </span>
                  ) : null}
                  <button type="button" onClick={() => navigate('/confirmations')} className={chromeButtonClass}>
                    {dashCopy.handleRequests}
                  </button>
                </div>
              )}
            </Centered>
          </DashCard>

          {/* Open conflicts (swipe deck) + draft-status inset panel. */}
          <div className="card-tex flex min-h-[188px] flex-[1.4] flex-col p-5">
            <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CountPill count={conflicts.length} />
                <h2 className="text-[22px] font-semibold text-ink">{dashCopy.openConflictsTitle}</h2>
              </div>
              <InfoTip text={dashCopy.infoConflicts} />
            </div>
            <div className="flex min-h-0 flex-1 gap-5">
              {/* Conflicts — one at a time, swipeable. */}
              <div className="flex min-h-0 flex-[1.7] flex-col">
                {conflicts.length === 0 ? (
                  <Centered>
                    <Empty text={dashCopy.noOpenConflicts} />
                  </Centered>
                ) : (
                  <SwipeDeck
                    items={conflicts}
                    renderItem={(c) => (
                      <div className="mx-auto w-full max-w-md rounded-xl border border-line/80 bg-panel-solid px-4 py-3">
                        <p className="mb-1.5 text-[16px] font-medium text-ink">{c.title}</p>
                        {c.description ? (
                          <p className="text-[13px] leading-relaxed text-ink-muted">{c.description}</p>
                        ) : null}
                      </div>
                    )}
                  />
                )}
              </div>

              {/* Draft status — soft state colour + thin state border fill the
                  whole block; the severity counts sit under the title as thin
                  red/orange chips. */}
              <div
                className={clsx(
                  'flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border p-4 text-center transition-colors',
                  DRAFT_STATE[draftState].panel
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className={clsx('text-[15px] font-semibold', DRAFT_STATE[draftState].text)}>
                    {dashCopy.draftStatusTitle}
                  </span>
                  {blocking > 0 || warning > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      {blocking > 0 ? (
                        <span className="tnum rounded-full border border-danger/50 bg-panel-solid px-3 py-1 text-[12px] font-semibold text-danger">
                          {blocking} {dashCopy.conflictsBlocking}
                        </span>
                      ) : null}
                      {warning > 0 ? (
                        <span className="tnum rounded-full border border-warning/50 bg-panel-solid px-3 py-1 text-[12px] font-semibold text-warning">
                          {warning} {dashCopy.conflictsWarning}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className={clsx('text-[13px] font-medium', DRAFT_STATE[draftState].text)}>
                      {draftState === 'unstaged' ? dashCopy.draftDiverged : dashCopy.draftPublished}
                    </span>
                  )}
                </div>
                {draftState !== 'ok' ? (
                  <button type="button" onClick={() => navigate('/schedule')} className={chromeButtonClass}>
                    {draftState === 'blocked' ? dashCopy.resolveConflicts : dashCopy.viewChanges}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Closest lectures — one at a time, swipeable, with confirmation status. */}
          <DashCard title={dashCopy.closestLectures} info={dashCopy.infoLectures} className="min-h-[212px] flex-1">
            {lectures.length === 0 ? (
              <Centered>
                <Empty text={emptyStates.noUpcomingLectures} />
              </Centered>
            ) : (
              <SwipeDeck
                items={lectures}
                renderItem={(e) => {
                  const details = lectureDetails.find((d) => d.eventId === e.id || `${d.eventId}-d` === e.id)
                  const lecturer = details ? lecturers.find((l) => l.id === details.lecturerId) : undefined
                  const subtitle = lecturer
                    ? [lecturer.fullName, lecturer.organization].filter(Boolean).join(' · ')
                    : (e.instructorName ?? '')
                  return (
                    // Thin bordered card, centred in the panel.
                    <div className="mx-auto flex w-full max-w-sm items-center gap-4 rounded-xl border border-line/80 bg-panel-solid p-3 text-start">
                      {/* Date block — grey/white, not indigo. */}
                      <div className="flex w-[70px] shrink-0 flex-col items-center justify-center rounded-lg border border-line/70 bg-neutral-block py-2">
                        <span className="tnum text-[30px] font-bold leading-none text-ink">
                          {Number.parseInt(e.date.slice(8, 10), 10)}
                        </span>
                        <span className="mt-1 text-[13px] font-medium leading-none text-ink-muted">
                          {hebrewMonths[Number.parseInt(e.date.slice(5, 7), 10) - 1]}
                        </span>
                      </div>
                      {/* Details — larger, filling the space. */}
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                        <p className="truncate text-[17px] font-semibold text-ink">{e.title}</p>
                        {subtitle ? (
                          <p className="truncate text-[13px] text-ink-muted">{subtitle}</p>
                        ) : null}
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="tnum text-[15px] font-semibold text-ink" dir="ltr">
                            {e.startTime}–{e.endTime}
                          </span>
                          {details ? <StatusChip status={details.confirmationStatus} /> : null}
                        </div>
                      </div>
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

function DashCard(props: {
  title: string
  info: string
  count?: number
  className?: string
  children: ReactNode
}) {
  return (
    <div className={clsx('card-tex flex flex-col p-5', props.className)}>
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {props.count != null ? <CountPill count={props.count} /> : null}
          <h2 className="text-[22px] font-semibold text-ink">{props.title}</h2>
        </div>
        <InfoTip text={props.info} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{props.children}</div>
    </div>
  )
}

/** Neutral total-count pill shown before a card title. */
function CountPill({ count }: { count: number }) {
  return (
    <span className="tnum flex h-7 min-w-7 items-center justify-center rounded-full bg-neutral-block px-2 text-[15px] font-semibold text-ink-muted">
      {count}
    </span>
  )
}

// Draft-status palette: the whole block takes the colour of the current state,
// with a thin state-tinted border.
const DRAFT_STATE = {
  ok: { panel: 'border-success/40 bg-success-soft', text: 'text-success' },
  unstaged: { panel: 'border-warning/40 bg-warning-soft', text: 'text-warning' },
  blocked: { panel: 'border-danger/40 bg-danger-soft', text: 'text-danger' }
} as const

/**
 * Single-item deck: shows one entry; drag/swipe it or click a pagination dot to
 * page. A rightward swipe advances (the next card slides in from the right); a
 * leftward swipe goes back. The drag has velocity flicks, rubber-band resistance
 * at the ends, and a spring settle.
 */
function SwipeDeck<T>({ items, renderItem }: { items: T[]; renderItem: (item: T) => ReactNode }) {
  const [index, setIndex] = useState(0)
  const [enterRight, setEnterRight] = useState(true)
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

  // fromRight: the new card slides in from the right (used by the right-side
  // control and a leftward swipe); false slides it in from the left.
  const go = useCallback(
    (delta: number, fromRight: boolean) => {
      setEnterRight(fromRight)
      setSnapping(false)
      setDragX(0)
      setIndex((i) => Math.min(Math.max(0, Math.min(i, count - 1) + delta), count - 1))
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
      // Gallery convention: drag right -> previous card slides in from the left;
      // drag left -> next card slides in from the right.
      if ((flick ? v : dx) > 0) go(-1, false)
      else go(1, true)
    } else {
      // Did not cross the threshold: spring back to centre.
      setSnapping(true)
      setDragX(0)
    }
  }

  // Resist dragging past the first/last item so the ends feel bounded.
  const blocked = (dragX > 0 && atStart) || (dragX < 0 && atEnd)
  const resisted = blocked ? dragX * 0.3 : dragX
  const enter = enterRight ? 'deckInRight' : 'deckInLeft'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
          <div key={clamped} style={{ animation: `${enter} 0.42s cubic-bezier(0.22, 1, 0.36, 1)` }}>
            {renderItem(items[clamped])}
          </div>
        </div>
      </div>
      {/* Bottom bar: prev button, pagination dots, next button (left-to-right). */}
      {count > 1 ? (
        <div dir="ltr" className="mt-3 flex shrink-0 items-center justify-center gap-2.5">
          <DeckNavButton dir="prev" disabled={atStart} onClick={() => go(-1, false)} />
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1}`}
                onClick={() => go(i - clamped, i > clamped)}
                className={clsx(
                  'h-2 rounded-full transition-all duration-300',
                  i === clamped ? 'w-5 bg-primary' : 'w-2 bg-line hover:bg-ink-muted'
                )}
              />
            ))}
          </div>
          <DeckNavButton dir="next" disabled={atEnd} onClick={() => go(1, true)} />
        </div>
      ) : null}
    </div>
  )
}

function DeckNavButton({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir}
      className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-neutral-block hover:text-ink disabled:pointer-events-none disabled:opacity-25"
    >
      <Icon name="chevron-down" size={18} className={dir === 'prev' ? 'rotate-90' : '-rotate-90'} />
    </button>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center">{children}</div>
}

function Empty({ text }: { text: string }) {
  return <p className="t-body text-center text-ink-muted">{text}</p>
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
    <span className={clsx('inline-block shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium', cls)}>
      {confirmationStatusLabels[status]}
    </span>
  )
}
