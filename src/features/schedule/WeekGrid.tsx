import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { clsx } from 'clsx'
import type { ScheduleEvent, TrainingSettings } from '@/types'
import { addDaysISO, toHHMM, toMinutes, todayISO } from '@/lib/time'
import { eventTypeColors } from '@/lib/theme'
import { dayNames, eventTypeLabels, warnings } from '@/lib/hebrewCopy'
import { hebDayInfo, hebrewDateShort } from '@/lib/hebcalendar'
import { Icon } from '@/assets/icons/Icon'
import { useNow } from '@/app/useNow'
import { PX_PER_HOUR, daySpecFor, gridRange, snapMinutes } from './gridUtils'
import { format, parseISO } from 'date-fns'

export interface WeekGridProps {
  events: ScheduleEvent[]
  weekStart: string // Sunday, "yyyy-MM-dd"
  settings: TrainingSettings
  editable?: boolean
  lockedDates?: string[]
  conflictedEventIds?: Set<string>
  onEventClick?: (event: ScheduleEvent) => void
  /** Relocate an event to an empty slot. */
  onEventDrop?: (eventId: string, newDate: string, newStartTime: string) => void
  /** Swap two flexible events' positions (Lego-style). */
  onEventSwap?: (aId: string, bId: string) => void
  onToggleDayLock?: (date: string, locked: boolean) => void
  /** Soldier view: hide hard/lock/visibility indicators (not relevant to them). */
  hideHardIndicators?: boolean
  /** Larger type + auto-fit to viewport for projection mode. */
  display?: boolean
}

interface DayInfo {
  date: string
  dow: number
  enabled: boolean
  startMinutes: number
  endMinutes: number
  locked: boolean
}

const GUTTER = '74px'
const MIN_HOUR_PX = 88 // floor: a 15-min block is ~22px — readable, and its true
// height so it never needs inflating (which would make it overlap the next block)
const MAX_HOUR_PX = 120
const MIN_BLOCK_H = 18 // tiny safety floor; real 15-min blocks clear it on their own
const SCROLL_RESERVE = 30 // keep the grid bottom clear of the page's padding
const TOP_PAD = 12 // spacer under the sticky header so 08:00 never hides behind it

/** Only flexible, non-locked, non-full-day blocks can move or be swapped. */
function isSwappable(e: ScheduleEvent): boolean {
  return !e.isLocked && !e.isFullDay
}

/** Mix a hex color toward black by `amt` (0..1) — used only for the thin rim. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const f = 1 - amt
  return `rgb(${Math.round(((n >> 16) & 255) * f)}, ${Math.round(((n >> 8) & 255) * f)}, ${Math.round((n & 255) * f)})`
}

/** Present event types across the given events — drives the standalone legend. */
export function ScheduleLegend({ events, className }: { events: ScheduleEvent[]; className?: string }) {
  const types = useMemo(() => {
    const present = new Set<ScheduleEvent['type']>()
    for (const e of events) present.add(e.type)
    return [...present]
  }, [events])
  if (types.length === 0) return null
  // Split across two right-aligned rows, balanced.
  const mid = Math.ceil(types.length / 2)
  const rows = [types.slice(0, mid), types.slice(mid)].filter((r) => r.length > 0)
  return (
    <div className={clsx('flex flex-col justify-center gap-2.5', className)}>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap justify-start gap-x-5 gap-y-1.5">
          {row.map((t) => (
            <span key={t} className="flex items-center gap-2 text-[15px] text-ink">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: eventTypeColors[t] }} />
              {eventTypeLabels[t]}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export function WeekGrid(props: WeekGridProps) {
  const { start: gridStart, end: gridEnd } = gridRange(props.settings)
  const hoursCount = (gridEnd - gridStart) / 60
  const today = todayISO()
  const now = useNow()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // One hour = one row. We fit the viewport where we can, but never below the
  // floor — blocks must stay tall enough for their title to breathe.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pxPerHour, setPxPerHour] = useState(PX_PER_HOUR)
  const [scrollMax, setScrollMax] = useState<number | undefined>(undefined)
  useEffect(() => {
    function measure() {
      const el = scrollRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const available = window.innerHeight - top - SCROLL_RESERVE
      setPxPerHour(Math.min(MAX_HOUR_PX, Math.max(MIN_HOUR_PX, Math.floor(available / hoursCount))))
      setScrollMax(props.display ? undefined : Math.max(320, available))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [props.display, hoursCount])

  const days: DayInfo[] = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDaysISO(props.weekStart, i)
        const spec = daySpecFor(i, props.settings)
        return {
          date,
          dow: i,
          enabled: spec.enabled,
          startMinutes: spec.startMinutes,
          endMinutes: spec.endMinutes,
          locked: props.lockedDates?.includes(date) ?? false
        }
      }),
    [props.weekStart, props.settings, props.lockedDates]
  )

  const weekEvents = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]))
    return props.events
      .filter((e) => byDate.has(e.date))
      .map((e) => ({ event: e, day: byDate.get(e.date)! }))
  }, [props.events, days])

  const eventById = useMemo(() => new Map(props.events.map((e) => [e.id, e])), [props.events])

  // Blocks sit at their true time, but never shrink below the readable minimum.
  // Where a minimum would collide with the block above, the block is pushed down
  // instead of overlapping; sparse stretches snap back to the axis.
  const { placements, canvasHeight } = useMemo(() => {
    const byDate = new Map<string, { event: ScheduleEvent; day: DayInfo }[]>()
    for (const we of weekEvents) {
      const arr = byDate.get(we.day.date) ?? []
      arr.push(we)
      byDate.set(we.day.date, arr)
    }
    const place = new Map<string, { top: number; height: number }>()
    let maxBottom = 0
    for (const arr of byDate.values()) {
      for (const { event, day } of arr) {
        const sMin = event.isFullDay ? day.startMinutes : toMinutes(event.startTime)
        const eMin = event.isFullDay ? day.endMinutes : toMinutes(event.endTime)
        // Exact proportional height and position — no push-down. Blocks touch (or
        // overlap) exactly as the commander's times dictate.
        const height = Math.max(MIN_BLOCK_H, ((eMin - sMin) / 60) * pxPerHour)
        const top = ((sMin - gridStart) / 60) * pxPerHour
        place.set(event.id, { top, height })
        if (top + height > maxBottom) maxBottom = top + height
      }
    }
    return { placements: place, canvasHeight: Math.max(hoursCount * pxPerHour, maxBottom + 8) }
  }, [weekEvents, pxPerHour, gridStart, hoursCount])

  // Axis marks every half hour: on-the-hour reads strong, the half reads light.
  const marks = useMemo(() => {
    const out: number[] = []
    for (let m = gridStart; m <= gridEnd; m += 30) out.push(m)
    return out
  }, [gridStart, gridEnd])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const dndEnabled = !!props.editable && (!!props.onEventDrop || !!props.onEventSwap)

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }
  function handleDragOver(e: DragOverEvent) {
    setOverId(e.over ? String(e.over.id) : null)
  }
  function handleDragEnd(dragEvent: DragEndEvent) {
    const { active, over, delta } = dragEvent
    setActiveId(null)
    setOverId(null)
    if (!over) return
    const event = eventById.get(String(active.id))
    if (!event || !isSwappable(event)) return
    const overKey = String(over.id)

    const targetEvent = eventById.get(overKey)
    if (targetEvent && targetEvent.id !== event.id) {
      if (isSwappable(targetEvent)) props.onEventSwap?.(event.id, targetEvent.id)
      return
    }

    const targetDay = days.find((d) => d.date === overKey)
    if (!targetDay || !targetDay.enabled || targetDay.locked) return

    const minuteDelta = snapMinutes(delta.y / (pxPerHour / 60))
    let newStart = toMinutes(event.startTime) + minuteDelta
    newStart = Math.max(targetDay.startMinutes, Math.min(targetDay.endMinutes - event.durationMinutes, newStart))
    if (newStart < targetDay.startMinutes) return
    const newEnd = newStart + event.durationMinutes

    const occupant = weekEvents.find(
      ({ event: o }) =>
        o.id !== event.id &&
        o.date === targetDay.date &&
        newStart < toMinutes(o.endTime) &&
        toMinutes(o.startTime) < newEnd
    )?.event
    if (occupant) {
      if (isSwappable(occupant) && props.onEventSwap) props.onEventSwap(event.id, occupant.id)
      return
    }
    props.onEventDrop?.(event.id, targetDay.date, toHHMM(newStart))
  }

  const todayInfo = days.find((d) => d.date === today)
  const nowVisible = !!todayInfo && nowMinutes >= gridStart && nowMinutes <= gridEnd

  const grid = (
    <div className="glass-solid p-0">
      <div
        ref={scrollRef}
        className="overflow-auto rounded-2xl"
        style={{ maxHeight: props.display ? undefined : scrollMax }}
      >
        <div className="min-w-[840px]">
          {/* Header row — sticky, so day names stay visible while times scroll. */}
          <div
            className="sticky top-0 z-20 grid border-b-2 border-line bg-panel-solid"
            style={{ gridTemplateColumns: `${GUTTER} repeat(7, 1fr)` }}
          >
            <div />
            {days.map((d) => (
              <DayHeader
                key={d.date}
                day={d}
                today={today}
                display={!!props.display}
                editable={!!props.editable}
                hideHardIndicators={props.hideHardIndicators}
                onToggleDayLock={props.onToggleDayLock}
              />
            ))}
          </div>

          {/* Spacer so the first time stamp (08:00) clears the sticky header. */}
          <div aria-hidden style={{ height: TOP_PAD }} />

          {/* Body: gutter + one shared canvas for all seven days */}
          <div className="grid" style={{ gridTemplateColumns: `${GUTTER} 1fr` }}>
            {/* Time gutter — hours in medium, half hours light and smaller. */}
            <div className="relative" style={{ height: canvasHeight }}>
              {marks.map((m) => {
                const onHour = m % 60 === 0
                return (
                  <div
                    key={m}
                    className="absolute flex w-full items-center justify-end gap-1.5 pe-2.5"
                    style={{ top: ((m - gridStart) / 60) * pxPerHour - 8 }}
                  >
                    <span
                      className={clsx(
                        'tnum',
                        onHour ? 'text-[14px] font-medium text-ink' : 'text-[12px] font-light text-ink-muted/70'
                      )}
                    >
                      {toHHMM(m)}
                    </span>
                    <span className={clsx('h-px', onHour ? 'w-2.5 bg-stone' : 'w-1.5 bg-stone/50')} />
                  </div>
                )
              })}
            </div>

            {/* Days canvas */}
            <div className="relative" style={{ height: canvasHeight }}>
              {/* Layer 1: day columns (tints, borders, droppables) */}
              <div className="absolute inset-0 grid grid-cols-7">
                {days.map((d) => (
                  <DayBackground
                    key={d.date}
                    day={d}
                    gridStart={gridStart}
                    gridEnd={gridEnd}
                    pxPerHour={pxPerHour}
                    editable={!!props.editable}
                    isToday={d.date === today}
                  />
                ))}
              </div>

              {/* Layer 2: axis lines. The top line is skipped so it never
                  overruns the first time stamp. */}
              {marks.map((m) =>
                m === gridStart ? null : (
                  <div
                    key={m}
                    className={clsx(
                      'pointer-events-none absolute inset-x-0 border-t',
                      m % 60 === 0 ? 'border-stone/55' : 'border-stone/20'
                    )}
                    style={{ top: ((m - gridStart) / 60) * pxPerHour }}
                  />
                )
              )}

              {/* Layer 3: the blocks — one overlay so position changes animate (fly) */}
              {weekEvents.map(({ event, day }) => (
                <EventBlock
                  key={event.id}
                  event={event}
                  day={day}
                  top={placements.get(event.id)?.top ?? 0}
                  blockHeight={placements.get(event.id)?.height ?? MIN_BLOCK_H}
                  editable={!!props.editable}
                  nowMinutes={nowMinutes}
                  isToday={day.date === today}
                  isActive={activeId === event.id}
                  isSwapTarget={overId === event.id && activeId != null && activeId !== event.id && isSwappable(event)}
                  conflicted={props.conflictedEventIds?.has(event.id) ?? false}
                  hideHardIndicators={props.hideHardIndicators}
                  onClick={props.onEventClick}
                />
              ))}

              {/* Layer 4: real-time "now" line inside today's column */}
              {nowVisible && todayInfo ? (
                <div
                  className="pointer-events-none absolute z-30"
                  style={{
                    top: ((nowMinutes - gridStart) / 60) * pxPerHour,
                    insetInlineStart: `${(todayInfo.dow / 7) * 100}%`,
                    width: `${100 / 7}%`
                  }}
                >
                  <div className="relative h-0.5 bg-danger">
                    <span className="absolute -end-1 -top-[3px] h-2 w-2 rounded-full bg-danger" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (dndEnabled) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null)
          setOverId(null)
        }}
      >
        {grid}
      </DndContext>
    )
  }
  return grid
}

function DayHeader(props: {
  day: DayInfo
  today: string
  display: boolean
  editable: boolean
  hideHardIndicators?: boolean
  onToggleDayLock?: (date: string, locked: boolean) => void
}) {
  const { day } = props
  const isToday = day.date === props.today
  const special = hebDayInfo(day.date)
  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-1 border-s-2 border-line px-2 py-2.5',
        isToday && 'bg-primary-soft'
      )}
    >
      <div className="min-w-0">
        {/* One line: day name, Gregorian date, a long dash, the Hebrew date
            (same size as the Gregorian). Any special-day tag sits below. The
            column is narrow, so the whole line is kept compact and never wraps. */}
        <div className="flex items-baseline gap-x-1 overflow-hidden">
          <span
            className={clsx('whitespace-nowrap font-semibold text-ink', props.display ? 'text-[22px]' : 'text-[16px]')}
          >
            {dayNames[day.dow]}
          </span>
          <span
            className={clsx(
              'tnum whitespace-nowrap font-normal text-ink-muted',
              props.display ? 'text-[22px]' : 'text-[16px]'
            )}
          >
            {format(parseISO(day.date), 'dd/MM')}
          </span>
          <span className={clsx('whitespace-nowrap font-light text-ink-muted/60', props.display ? 'text-[18px]' : 'text-[13px]')}>
            —
          </span>
          <span
            className={clsx('whitespace-nowrap font-light text-ink-muted', props.display ? 'text-[22px]' : 'text-[16px]')}
          >
            {hebrewDateShort(day.date)}
          </span>
        </div>
        {special ? (
          <span
            className={clsx(
              'mt-1 inline-block rounded-md px-1.5 py-0.5 text-[12px] font-medium',
              special.kind === 'fast'
                ? 'bg-danger-soft text-danger'
                : special.kind === 'holiday' || special.kind === 'cholhamoed'
                  ? 'bg-primary-soft text-primary-hover'
                  : 'bg-neutral-block text-ink-muted'
            )}
          >
            {special.label}
          </span>
        ) : null}
      </div>
      {props.onToggleDayLock && props.editable ? (
        <button
          type="button"
          title={day.locked ? warnings.lockedDay : undefined}
          aria-label={day.locked ? 'פתח נעילה' : 'נעל יום'}
          onClick={() => props.onToggleDayLock?.(day.date, !day.locked)}
          className={clsx(
            'focus-ring shrink-0 rounded-lg p-1',
            day.locked ? 'text-warning' : 'text-ink-muted/40 hover:text-ink-muted'
          )}
        >
          <Icon name={day.locked ? 'lock' : 'unlock'} size={14} />
        </button>
      ) : day.locked && !props.hideHardIndicators ? (
        <span title={warnings.lockedDay} className="shrink-0 text-warning">
          <Icon name="lock" size={14} />
        </span>
      ) : null}
    </div>
  )
}

function DayBackground(props: {
  day: DayInfo
  gridStart: number
  gridEnd: number
  pxPerHour: number
  editable: boolean
  isToday: boolean
}) {
  const { day } = props
  const { setNodeRef, isOver } = useDroppable({
    id: day.date,
    disabled: !props.editable || !day.enabled || day.locked
  })

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'relative border-s-2 border-line first:border-s-0',
        !day.enabled && 'bg-neutral-block/70',
        day.locked && 'bg-warning/[0.04]',
        props.isToday && 'bg-primary-soft/30',
        isOver && 'bg-primary-soft/60'
      )}
    >
      {day.enabled ? (
        <>
          {day.startMinutes > props.gridStart ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-neutral-block/60"
              style={{ height: ((day.startMinutes - props.gridStart) / 60) * props.pxPerHour }}
            />
          ) : null}
          {day.endMinutes < props.gridEnd ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-neutral-block/60"
              style={{ height: ((props.gridEnd - day.endMinutes) / 60) * props.pxPerHour }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function EventBlock(props: {
  event: ScheduleEvent
  day: DayInfo
  top: number
  blockHeight: number
  editable: boolean
  nowMinutes: number
  isToday: boolean
  isActive: boolean
  isSwapTarget: boolean
  conflicted: boolean
  hideHardIndicators?: boolean
  onClick?: (event: ScheduleEvent) => void
}) {
  const { event: e, day } = props
  const draggable = props.editable && isSwappable(e) && !day.locked

  const drag = useDraggable({ id: e.id, disabled: !draggable })
  const drop = useDroppable({ id: e.id, disabled: !props.editable })
  const setRefs = (node: HTMLElement | null) => {
    drag.setNodeRef(node)
    drop.setNodeRef(node)
  }

  const startMin = e.isFullDay ? day.startMinutes : toMinutes(e.startTime)
  const endMin = e.isFullDay ? day.endMinutes : toMinutes(e.endTime)

  const color = e.color ?? eventTypeColors[e.type] ?? '#3a86ff'
  const isNow = props.isToday && !e.isFullDay && props.nowMinutes >= startMin && props.nowMinutes < endMin
  const timeText = e.isFullDay ? 'יום מלא' : `${e.startTime}–${e.endTime}`

  // How many text lines actually fit, so the title never breaks off at the
  // bottom at any block height. The content is vertically centred, the title is
  // clamped to the lines that fit, and — when there's a line to spare — the time
  // takes the last line (revealed on hover); otherwise it swaps the title.
  const LINE_H = 19 // a 15px title at leading-tight
  const innerH = props.blockHeight - 3 // minus the 1.5px rim on each edge
  const totalLines = Math.max(1, Math.min(3, Math.floor(innerH / LINE_H)))
  const canReveal = totalLines >= 2
  const titleLines = canReveal ? totalLines - 1 : 1

  // The block IS the colour panel now — flat fill, a thin same-hue rim (no grey
  // frame), less-rounded corners, no line texture.
  const blockStyle = {
    backgroundColor: color,
    border: `1.5px solid ${shade(color, 0.28)}`,
    top: props.top,
    height: props.blockHeight,
    insetInlineStart: `calc(${(day.dow / 7) * 100}% + 5px)`,
    width: `calc(${100 / 7}% - 10px)`,
    transform: drag.transform
      ? `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0) scale(1.02)`
      : undefined
  } as CSSProperties

  const clampStyle = {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: titleLines,
    overflow: 'hidden'
  } as CSSProperties

  const indicators =
    e.sharedGroupId || (!props.hideHardIndicators && (e.isLocked || !e.visibleToSoldiers)) ? (
      <span className="absolute start-1.5 top-1.5 z-20 flex items-center gap-1 text-white opacity-80">
        {e.sharedGroupId ? <Icon name="link" size={12} /> : null}
        {!props.hideHardIndicators && e.isLocked ? <Icon name="lock" size={12} /> : null}
        {!props.hideHardIndicators && !e.visibleToSoldiers ? <Icon name="eye-off" size={12} /> : null}
      </span>
    ) : null

  // Time and title share the exact same size and weight (15px / 600, white).
  const textClass = 'text-[15px] font-semibold leading-tight text-white'

  return (
    <div
      ref={setRefs}
      {...drag.listeners}
      {...drag.attributes}
      role="button"
      tabIndex={0}
      onClick={() => props.onClick?.(e)}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') props.onClick?.(e)
      }}
      title={draggable ? undefined : e.isLocked && !props.hideHardIndicators ? (e.lockReason ?? 'נעול') : undefined}
      className={clsx(
        'group absolute z-10 flex flex-col justify-start overflow-hidden rounded-md px-2.5 py-0 text-right shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary hover:shadow-md',
        props.isActive
          ? 'transition-none'
          : 'transition-[top,height,inset-inline-start,transform,box-shadow] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        draggable ? 'cursor-grab active:cursor-grabbing' : props.onClick ? 'cursor-pointer' : 'cursor-default',
        drag.isDragging && 'z-40 opacity-95 shadow-pop',
        props.isSwapTarget && '-translate-y-1.5 shadow-lift ring-2 ring-primary',
        props.conflicted && 'ring-2 ring-danger ring-offset-1',
        isNow && !props.conflicted && !props.isSwapTarget && 'ring-2 ring-ink/60'
      )}
      style={blockStyle}
    >
      {indicators}
      <span
        className={clsx(
          'relative z-10 w-full break-words text-right transition-opacity duration-200',
          textClass,
          !canReveal && 'group-hover:opacity-0'
        )}
        style={clampStyle}
      >
        {e.title}
      </span>
      {canReveal ? (
        // The time takes the reserved last line, revealed on hover.
        <span
          dir="ltr"
          className={clsx('tnum relative z-10 w-full truncate text-right opacity-0 transition-opacity duration-200 group-hover:opacity-100', textClass)}
        >
          {timeText}
        </span>
      ) : (
        // Tiny blocks: swap the title for the time (same size + weight), same spot.
        <span
          dir="ltr"
          className={clsx(
            'tnum absolute inset-x-2.5 top-0 z-10 truncate text-right opacity-0 transition-opacity duration-200 group-hover:opacity-100',
            textClass
          )}
        >
          {timeText}
        </span>
      )}
    </div>
  )
}
