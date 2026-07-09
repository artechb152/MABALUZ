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
import { formatDateHe, todayISO } from '@/lib/time'
import { EventRow, SectionCard } from './widgets'
import { dashCopy } from './copy'

export function SoldierDashboard() {
  const user = useCurrentUser()
  const training = useMyTrainings()[0] ?? null
  const published = usePublishedSchedule(training)
  const users = useDb((s) => s.users)
  const notifications = useMyNotifications().slice(0, 5)

  const commander = users.find((u) => u.id === training?.commanderId)
  const today = todayISO()
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
    <div>
      {/* No header action button: reaching the schedule is already covered by the
          in-card "לצפייה בלו״ז המלא" link and the sidebar. */}
      <PageHeader
        title={user ? dashCopy.hello(user.firstName) : nav.dashboard}
        subtitle={training.name}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Right column (RTL first): compact "ההכשרה שלי" + "הערות המפקד" beneath it. */}
        <div className="space-y-4">
          <SectionCard title={dashboards.myTraining}>
            <dl className="space-y-1.5">
              {/* Training name intentionally omitted — it already appears under the greeting. */}
              <Row
                label={dashboards.trainingDates}
                value={`${formatDateHe(training.startDate)} — ${formatDateHe(training.endDate)}`}
              />
              <Row label="בסיס" value={training.base} />
              <Row label={dashboards.myCommander} value={commander?.displayName ?? ''} />
            </dl>
          </SectionCard>

          <SectionCard title={dashboards.commanderNotes}>
            {published?.commanderNote ? (
              <p className="t-body text-ink">{published.commanderNote}</p>
            ) : (
              <p className="t-body text-ink-muted">{dashCopy.noCommanderNote}</p>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title={dashCopy.todayInSchedule}
          action={<ViewFullScheduleLink />}
        >
          <div className="space-y-2">
            {todayEvents.length === 0 ? (
              <p className="t-body py-4 text-center text-ink-muted">{dashCopy.nothingToday}</p>
            ) : (
              todayEvents.map((e) => <EventRow key={e.id} event={e} showDate={false} />)
            )}
          </div>
        </SectionCard>

        <SectionCard title={dashboards.notifications}>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <p className="t-body py-4 text-center text-ink-muted">{emptyStates.noNotifications}</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="rounded-xl border border-line bg-panel-solid px-3 py-2">
                  <div className="flex items-center gap-2">
                    {!n.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                    <span className="t-body font-medium text-ink">{n.title}</span>
                  </div>
                  {n.body ? <p className="t-detail mt-0.5 text-ink-muted">{n.body}</p> : null}
                </div>
              ))
            )}
          </div>
        </SectionCard>
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

// Label - value on one RTL line. Weight is the distinction: labels (and the
// dash) Assistant 400, values Assistant 300 — both 16px.
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="t-body shrink-0 font-normal text-ink-muted">{label}</dt>
      <span className="t-body font-normal text-ink-muted">-</span>
      <dd className="t-body font-light text-ink">{value}</dd>
    </div>
  )
}
