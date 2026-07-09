import { useEffect, useMemo, useRef, useState } from 'react'
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
  /** Scale rows so the whole week fits the viewport without scrolling (default on). */
  fitToScreen?: boolean
  /** Larger type for projection mode. */
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

const GUTTER = '64px'
const FIT_RESERVE = 84 // legend + card chrome below the grid body

/** Only flexible, non-locked, non-full-day blocks can move or be swapped. */
function isSwappable(e: ScheduleEvent): boolean {
  return !e.isLocked && !e.isFullDay
}

export function WeekGrid(props: WeekGridProps) {
  const { start: gridStart, end: gridEnd } = gridRange(props.settings)
  const hoursCount = (gridEnd - gridStart) / 60
  const today = todayISO()
  const now = useNow()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Fit the full day range into the available viewport height.
  const bodyRef = useRef<HTMLDivElement>(null)
  const [pxPerHour, setPxPerHour] = useState(PX_PER_HOUR)
  const fit = props.fitToScreen !== false
  useEffect(() => {
    if (!fit) return
    function measure() {
      const el = bodyRef.current
      if (!el) return
      const available = window.innerHeight - el.getBoundingClientRect().top - FIT_RESERVE
      setPxPerHour(Math.min(96, Math.max(36, Math.floor(available / hoursCount))))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [fit, hoursCount])

  const totalHeight = hoursCount * pxPerHour

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

  const hours: number[] = []
  for (let m = gridStart; m <= gridEnd; m += 60) hours.push(m)

  const typesInWeek = useMemo(() => {
    const present = new Set<ScheduleEvent['type']>()
    for (const { event } of weekEvents) present.add(event.type)
    return [...present]
  }, [weekEvents])

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

    // Dropped directly on another block -> swap (if that block is swappable too).
    const targetEvent = eventById.get(overKey)
    if (targetEvent && targetEvent.id !== event.id) {
      if (isSwappable(targetEvent)) props.onEventSwap?.(event.id, targetEvent.id)
      return
    }

    // Dropped on a day column -> relocate, or swap with whatever occupies the slot.
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
      // No resting on top of others: swap with the occupant if allowed, else no-op.
      if (isSwappable(occupant) && props.onEventSwap) props.onEventSwap(event.id, occupant.id)
      return
    }
    props.onEventDrop?.(event.id, targetDay.date, toHHMM(newStart))
  }

  const todayInfo = days.find((d) => d.date === today)
  const nowVisible = !!todayInfo && nowMinutes >= gridStart && nowMinutes <= gridEnd

  const grid = (
    <div className="glass-solid overflow-x-auto p-0">
      <div className="min-w-[960px]">
        {/* Header row */}
        <div className="grid border-b-2 border-line" style={{ gridTemplateColumns: `${GUTTER} repeat(7, 1fr)` }}>
          <div />
          {days.map((d) => (
            <div
              key={d.date}
              className={clsx(
                'flex items-center justify-between gap-1 border-s-2 border-line px-2.5 py-2',
                d.date === today && 'bg-primary-soft'
              )}
            >
              <div className="min-w-0">
                <div className={clsx('truncate font-semibold text-ink', props.display ? 'text-subhead' : 'text-body')}>
                  {dayNames[d.dow]}
                </div>
                <div className="tnum t-body font-light text-ink-muted">{format(parseISO(d.date), 'dd/MM')}</div>
              </div>
              {props.onToggleDayLock && props.editable ? (
                <button
                  type="button"
                  title={d.locked ? warnings.lockedDay : undefined}
                  aria-label={d.locked ? 'פתח נעילה' : 'נעל יום'}
                  onClick={() => props.onToggleDayLock?.(d.date, !d.locked)}
                  className={clsx(
                    'focus-ring rounded-lg p-1',
                    d.locked ? 'text-warning' : 'text-ink-muted/40 hover:text-ink-muted'
                  )}
                >
                  <Icon name={d.locked ? 'lock' : 'unlock'} size={14} />
                </button>
              ) : d.locked && !props.hideHardIndicators ? (
                <span title={warnings.lockedDay} className="text-warning">
                  <Icon name="lock" size={14} />
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Body: gutter + one shared canvas for all seven days */}
        <div ref={bodyRef} className="grid" style={{ gridTemplateColumns: `${GUTTER} 1fr` }}>
          {/* Time gutter (right side in RTL) — bolder, more visible stamps */}
          <div className="relative" style={{ height: totalHeight }}>
            {hours.map((m) => (
              <div
                key={m}
                className="tnum t-detail absolute w-full pe-2.5 text-end font-medium text-ink"
                style={{ top: ((m - gridStart) / 60) * pxPerHour - 8 }}
              >
                {toHHMM(m)}
              </div>
            ))}
          </div>

          {/* Days canvas */}
          <div className="relative" style={{ height: totalHeight }}>
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

            {/* Layer 2: continuous hour lines across the whole week */}
            {hours.map((m) => (
              <div
                key={m}
                className="pointer-events-none absolute inset-x-0 border-t border-stone/70"
                style={{ top: ((m - gridStart) / 60) * pxPerHour }}
              />
            ))}

            {/* Layer 3: the blocks — one overlay so position changes animate (fly) */}
            {weekEvents.map(({ event, day }) => (
              <EventBlock
                key={event.id}
                event={event}
                day={day}
                gridStart={gridStart}
                pxPerHour={pxPerHour}
                editable={!!props.editable}
                display={!!props.display}
                nowMinutes={nowMinutes}
                isToday={day.date === today}
                isActive={activeId === event.id}
                anyDragActive={activeId != null}
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

      {/* Legend */}
      {typesInWeek.length > 0 ? (
        <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2.5">
          {typesInWeek.map((t) => (
            <span key={t} className="t-detail flex items-center gap-1.5 text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: eventTypeColors[t] }} />
              {eventTypeLabels[t]}
            </span>
          ))}
        </div>
      ) : null}
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
  gridStart: number
  pxPerHour: number
  editable: boolean
  display: boolean
  nowMinutes: number
  isToday: boolean
  isActive: boolean
  anyDragActive: boolean
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
  const top = ((startMin - props.gridStart) / 60) * props.pxPerHour
  const height = Math.max(13, ((endMin - startMin) / 60) * props.pxPerHour - 3)
  const color = e.color ?? eventTypeColors[e.type] ?? '#185FA5'

  const isNow = props.isToday && !e.isFullDay && props.nowMinutes >= startMin && props.nowMinutes < endMin

  // Hover behavior: the colored block shrinks to half its height and a white
  // detail board slides out beneath it. Needs enough height to split.
  const splittable = height >= 52
  const timeText = e.isFullDay ? 'יום מלא' : `${e.startTime}-${e.endTime}`
  const secondLine = e.location ?? e.shortDescription
  const showSecondLine = height >= 96

  const indicators = (
    <span className="mt-1 flex shrink-0 items-center gap-1 opacity-90">
      {isNow ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> : null}
      {e.sharedGroupId ? <Icon name="link" size={13} /> : null}
      {!props.hideHardIndicators && e.isLocked ? <Icon name="lock" size={13} /> : null}
      {!props.hideHardIndicators && !e.visibleToSoldiers ? <Icon name="eye-off" size={13} /> : null}
    </span>
  )

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
        'group absolute z-10 overflow-hidden rounded-lg border border-black/5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary',
        // Fly animation: position/size changes (swap, move) glide smoothly.
        props.isActive
          ? 'transition-none'
          : 'transition-[top,height,inset-inline-start,transform,box-shadow] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        draggable ? 'cursor-grab active:cursor-grabbing' : props.onClick ? 'cursor-pointer' : 'cursor-default',
        drag.isDragging && 'z-40 opacity-95 shadow-pop',
        props.isSwapTarget && '-translate-y-1.5 shadow-lift ring-2 ring-primary',
        props.conflicted && 'ring-2 ring-danger ring-offset-1',
        isNow && !props.conflicted && 'ring-2 ring-ink/60'
      )}
      style={{
        top,
        height,
        insetInlineStart: `calc(${(day.dow / 7) * 100}% + 4px)`,
        width: `calc(${100 / 7}% - 8px)`,
        transform: drag.transform
          ? `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0) scale(1.02)`
          : undefined
      }}
    >
      {splittable ? (
        <div className="grid h-full grid-rows-[1fr_0fr] transition-[grid-template-rows] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:grid-rows-[1fr_1fr]">
          {/* Colored half (full height until hover) */}
          <div className="min-h-0 overflow-hidden text-white" style={{ backgroundColor: color }}>
            <div className="flex items-start justify-between gap-1 px-2 py-1">
              <span className="truncate text-[20px] font-semibold leading-tight transition-[font-size] duration-[380ms] group-hover:text-[16px]">
                {e.title}
              </span>
              {indicators}
            </div>
          </div>
          {/* White board that slides out underneath on hover */}
          <div className="min-h-0 overflow-hidden bg-panel-solid">
            <div className="px-2 py-1 opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100">
              <div className="tnum t-body font-light text-ink">{timeText}</div>
              {showSecondLine && secondLine ? (
                <div className="t-body truncate font-light text-ink-muted">{secondLine}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        // Tiny blocks: colored only, compact text.
        <div className="flex h-full items-center justify-between gap-1 px-1.5 text-white" style={{ backgroundColor: color }}>
          <span className="t-detail truncate font-semibold leading-none">{e.title}</span>
          {height >= 22 ? indicators : null}
        </div>
      )}
    </div>
  )
}
