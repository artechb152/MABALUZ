import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import type { ScheduleEvent } from '@/types'
import { Icon, type IconName } from '@/assets/icons/Icon'
import { eventTypeColors } from '@/lib/theme'
import { formatDateHe } from '@/lib/time'
import { dashCopy } from './copy'

export function StatCard(props: {
  label: string
  value: number | string
  /** Legacy prop — no longer rendered (icon-stat look retired). */
  icon?: IconName
  tone?: 'primary' | 'danger' | 'warning' | 'success' | 'neutral'
  onClick?: () => void
}) {
  const tone = props.tone ?? 'primary'
  const toneText =
    tone === 'danger'
      ? 'text-danger'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'success'
          ? 'text-success'
          : tone === 'neutral'
            ? 'text-ink'
            : 'text-primary-hover'

  const inner = (
    <>
      <div className={clsx('tnum text-[32px] font-bold leading-none', toneText)}>{props.value}</div>
      <div className="mt-1.5 text-[15px] font-medium text-ink-muted">{props.label}</div>
    </>
  )

  if (props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className="card-tex focus-ring block p-5 text-start transition-shadow hover:shadow-card-hover"
      >
        {inner}
      </button>
    )
  }
  return <div className="card-tex p-5">{inner}</div>
}

export function EventRow({ event, showDate = true }: { event: ScheduleEvent; showDate?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-panel-solid px-3 py-2">
      <span
        className="h-8 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: event.color ?? eventTypeColors[event.type] }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="t-body truncate font-medium text-ink">{event.title}</span>
          {event.isLocked ? <Icon name="lock" size={12} className="shrink-0 text-ink-muted" /> : null}
          {event.sharedGroupId ? <Icon name="link" size={12} className="shrink-0 text-ink-muted" /> : null}
        </div>
        <div className="tnum t-detail text-ink-muted">
          {showDate ? `${formatDateHe(event.date)} | ` : ''}
          {event.isFullDay ? dashCopy.fullDay : `${event.startTime}-${event.endTime}`}
          {event.location ? ` | ${event.location}` : ''}
        </div>
      </div>
    </div>
  )
}

export function SectionCard(props: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="card-tex p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[22px] font-semibold text-ink">{props.title}</h2>
        {props.action}
      </div>
      {props.children}
    </div>
  )
}
