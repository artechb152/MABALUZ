import type { CSSProperties } from 'react'
import { clsx } from 'clsx'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/assets/icons/Icon'
import { dashboards, emptyStates, nav } from '@/lib/hebrewCopy'
import {
  useCurrentUser,
  useMyNotifications,
  useMyTrainings,
  usePublishedSchedule
} from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { useNow } from '@/app/useNow'
import { eventTypeColors } from '@/lib/theme'
import { formatDateHe, todayISO, toMinutes } from '@/lib/time'
import type { ScheduleEvent } from '@/types'
import { dashCopy } from './copy'

export function SoldierDashboard() {
  const user = useCurrentUser()
  const training = useMyTrainings()[0] ?? null
  const published = usePublishedSchedule(training)
  const users = useDb((s) => s.users)
  const notifications = useMyNotifications().slice(0, 4)
  const now = useNow()

  const commander = users.find((u) => u.id === training?.commanderId)
  const today = todayISO()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayEvents = (published?.events ?? [])
    .filter((e) => e.date === today && e.visibleToSoldiers)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.dashboard} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  return (
    // Fills the viewport: the page itself never scrolls, the columns do.
    <div className="flex h-full flex-col">
      <PageHeader title={user ? dashCopy.hello(user.firstName) : nav.dashboard} />

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
        {/* Today in the schedule — the hero, right after the sidebar. Plain white
            card: the texture lives only on the coloured blocks inside it. */}
        <section className="relative flex min-h-0 flex-col rounded-2xl border border-line bg-panel-solid p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between gap-2">
            <h2 className="t-display text-[22px]">{dashCopy.todayInSchedule}</h2>
            <ViewFullScheduleLink />
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

        {/* Left column: my training / messages / commander notes. */}
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pe-1">
          <div className="card-tex p-5">
            <h2 className="mb-3 text-[22px] font-semibold text-ink">{dashboards.myTraining}</h2>
            <dl className="space-y-1.5">
              <Row label={dashboards.trainingName} value={training.name} />
              <Row
                label={dashboards.trainingDates}
                value={`${formatDateHe(training.startDate)} — ${formatDateHe(training.endDate)}`}
              />
              <Row label={dashboards.base} value={training.base} />
              <Row label={dashboards.myCommander} value={commander?.displayName ?? ''} />
            </dl>
          </div>

          <div className="card-tex p-5">
            <h2 className="mb-3 text-[22px] font-semibold text-ink">{dashboards.notifications}</h2>
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="t-body py-3 text-center text-ink-muted">{emptyStates.noNotifications}</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-line bg-panel-solid/80 px-3 py-2 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2">
                      {!n.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                      <span className="text-[18px] font-normal text-ink">{n.title}</span>
                    </div>
                    {n.body ? <p className="mt-0.5 text-[18px] font-light text-ink-muted">{n.body}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-tex p-5">
            <h2 className="mb-3 text-[22px] font-semibold text-ink">{dashboards.commanderNotes}</h2>
            {published?.commanderNote ? (
              <p className="text-[18px] font-normal leading-relaxed text-ink">{published.commanderNote}</p>
            ) : (
              <p className="text-[18px] font-light text-ink-muted">{dashCopy.noCommanderNote}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A "today" row: a flat colour block fills two-thirds on the right, its title
 * always white, with round white dots sliding in from the left edge and fading
 * by 66%. The hours sit on the left in ink. When the event is happening now, the
 * whole card pulses a rose-red halo and a red pulse sits in the block's top-left.
 */
function TodayBlock({ event, isNow }: { event: ScheduleEvent; isNow: boolean }) {
  const color = event.color ?? eventTypeColors[event.type] ?? '#3a86ff'

  return (
    <div
      className={clsx(
        'relative flex items-stretch gap-2 rounded-2xl bg-panel-solid p-1.5 shadow-card',
        isNow ? 'now-live border-2 border-[#ff006e]' : 'ring-1 ring-line/70'
      )}
    >
      {/* Colored part (RTL start / right). */}
      <div className="relative flex flex-[2] items-center overflow-hidden rounded-xl px-5 py-4 shadow-md" style={{ backgroundColor: color }}>
        <span className="tex-dots tex-mask-left rounded-xl" style={{ '--tex-fg': 'rgba(255,255,255,0.8)' } as CSSProperties} />
        {isNow ? (
          <span className="absolute end-2.5 top-2.5 z-20 h-2.5 w-2.5 animate-pulse rounded-full" style={{ backgroundColor: '#ff006e' }} />
        ) : null}
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

function ViewFullScheduleLink() {
  return (
    <a
      href="#/my-schedule"
      className="focus-ring t-body group inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium text-primary-hover transition-colors hover:bg-primary-soft"
    >
      {dashCopy.fullScheduleShort}
      <Icon
        name="chevron-left"
        size={15}
        className="transition-transform duration-300 group-hover:-translate-x-1"
      />
    </a>
  )
}

// Label - value on one RTL line. Weight is the distinction: labels 400, values 300.
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="shrink-0 text-[18px] font-normal text-ink-muted">{label}</dt>
      <span className="text-[18px] font-normal text-ink-muted">-</span>
      <dd className="text-[18px] font-light text-ink">{value}</dd>
    </div>
  )
}
