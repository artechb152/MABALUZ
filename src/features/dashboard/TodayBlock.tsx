import type { CSSProperties } from 'react'
import { clsx } from 'clsx'
import type { ScheduleEvent } from '@/types'
import { eventTypeColors } from '@/lib/theme'
import { dashCopy } from './copy'

/**
 * A "today" row shared by every role's dashboard: a flat colour block on the
 * right (white title, round white dots fading in from the left), the hours to
 * its left in ink, and — when the event is happening now — a pulsing rose-red
 * halo on the white card with a red pulse in its top-left corner.
 */
export function TodayBlock({ event, isNow }: { event: ScheduleEvent; isNow: boolean }) {
  const color = event.color ?? eventTypeColors[event.type] ?? '#3a86ff'

  return (
    <div
      className={clsx(
        'relative flex items-stretch gap-2 rounded-2xl bg-panel-solid p-1.5 shadow-card',
        isNow ? 'now-live border-2 border-[#ff006e]' : 'ring-1 ring-line/70'
      )}
    >
      {isNow ? (
        <span
          className="absolute end-2 top-2 z-30 h-2.5 w-2.5 animate-pulse rounded-full"
          style={{ backgroundColor: '#ff006e' }}
        />
      ) : null}
      {/* Colored part (RTL start / right). */}
      <div
        className="relative flex flex-[2] items-center overflow-hidden rounded-xl px-5 py-4 shadow-md"
        style={{ backgroundColor: color }}
      >
        <span
          className="tex-dots tex-mask-left rounded-xl"
          style={{ '--tex-fg': 'rgba(255,255,255,0.8)' } as CSSProperties}
        />
        <span className="relative z-10 line-clamp-2 w-full text-right text-[22px] font-semibold leading-tight text-white">
          {event.title}
        </span>
      </div>
      {/* Hours (RTL end / left) */}
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
        {event.isFullDay ? (
          <span className="t-body font-light text-ink">{dashCopy.fullDay}</span>
        ) : (
          <>
            <span className="tnum text-[20px] font-light leading-none text-ink">{event.startTime}</span>
            <span className="h-3 w-px bg-line" />
            <span className="tnum text-[16px] font-light leading-none text-ink-muted">{event.endTime}</span>
          </>
        )}
      </div>
    </div>
  )
}
