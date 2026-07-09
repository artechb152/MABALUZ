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
  icon: IconName
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
  const toneBg =
    tone === 'danger'
      ? 'bg-danger-soft'
      : tone === 'warning'
        ? 'bg-warning-soft'
        : tone === 'success'
          ? 'bg-success-soft'
          : 'bg-primary-soft'

  const inner = (
    <>
      <span className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', toneBg, toneText)}>
        <Icon name={props.icon} size={19} />
      </span>
      <div className="min-w-0">
        <div className={clsx('tnum text-2xl font-bold leading-tight', toneText)}>{props.value}</div>
        <div className="truncate text-xs text-ink-muted">{props.label}</div>
      </div>
    </>
  )

  if (props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className="focus-ring glass flex items-center gap-3 p-4 text-start transition-shadow hover:shadow-card-hover"
      >
        {inner}
      </button>
    )
  }
  return <div className="glass flex items-center gap-3 p-4">{inner}</div>
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
    <div className="glass p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="t-subhead">{props.title}</h2>
        {props.action}
      </div>
      {props.children}
    </div>
  )
}
