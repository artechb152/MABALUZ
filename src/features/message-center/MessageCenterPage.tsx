import { useMemo, useState } from 'react'
import type { MessageLogEntry } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Icon } from '@/assets/icons/Icon'
import {
  buttons,
  confirmationStatusLabels,
  emptyStates,
  messageCenter,
  nav
} from '@/lib/hebrewCopy'
import { useDb } from '@/app/dbStore'
import { formatDateHe } from '@/lib/time'
import { runReminderScheduler, type SchedulerRunResult } from './reminderScheduler'
import { mcCopy } from './copy'
import { clsx } from 'clsx'

export function MessageCenterPage() {
  const { messages, guestLectureDetails, schedules, lecturers } = useDb()
  const [lastRun, setLastRun] = useState<SchedulerRunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const upcoming = useMemo(() => {
    const allEvents = schedules.flatMap((s) => s.events)
    return guestLectureDetails
      .map((d) => ({
        details: d,
        event: allEvents.find((e) => e.id === d.eventId) ?? allEvents.find((e) => e.id === `${d.eventId}-d`),
        lecturer: lecturers.find((l) => l.id === d.lecturerId)
      }))
      .filter((x) => x.event)
      .sort((a, b) => (a.event!.date + a.event!.startTime).localeCompare(b.event!.date + b.event!.startTime))
  }, [guestLectureDetails, schedules, lecturers])

  async function runNow() {
    setRunning(true)
    try {
      setLastRun(await runReminderScheduler())
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={nav.messageCenter}
        subtitle={messageCenter.senderName}
        actions={
          <Button onClick={() => void runNow()} loading={running}>
            <Icon name="message-center" size={16} />
            {buttons.runReminderScheduler}
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <div className="glass p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">{messageCenter.providerStatus}</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-success">
              <Icon name="success" size={15} />
              {messageCenter.mockProvider}
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-neutral-block px-3 py-2 text-ink-muted">
              <Icon name="lock" size={15} />
              {messageCenter.outlookDisabled}
            </div>
          </div>
        </div>

        <div className="glass p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-ink">{mcCopy.upcomingConfirmations}</h2>
          {upcoming.length === 0 ? (
            <p className="py-3 text-center text-sm text-ink-muted">{emptyStates.noUpcomingLectures}</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map(({ details, event, lecturer }) => (
                <div key={details.eventId} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel-solid px-3 py-2 text-sm">
                  <span className="font-medium text-ink">{event!.title}</span>
                  <span className="tnum text-xs text-ink-muted">
                    {formatDateHe(event!.date)} {event!.startTime}
                  </span>
                  <span className="text-xs text-ink-muted">{lecturer?.fullName}</span>
                  <Badge
                    tone={
                      details.confirmationStatus === 'CONFIRMED'
                        ? 'success'
                        : details.confirmationStatus === 'REMINDER_SENT'
                          ? 'primary'
                          : details.confirmationStatus === 'CANCELLED'
                            ? 'danger'
                            : 'neutral'
                    }
                  >
                    {confirmationStatusLabels[details.confirmationStatus]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lastRun ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-hover">
          <Icon name="success" size={16} />
          <span className="tnum">{mcCopy.runSummary(lastRun.remindersSent, lastRun.thankYousSent, lastRun.warningsRaised)}</span>
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-bold text-ink">{mcCopy.logTitle}</h2>
      {messages.length === 0 ? (
        <EmptyState message={emptyStates.noMessages} />
      ) : (
        <div className="glass-solid overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-neutral-block/70 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">{mcCopy.recipient}</th>
                <th className="px-3 py-2.5 text-start font-medium">{mcCopy.subject}</th>
                <th className="px-3 py-2.5 text-start font-medium">{mcCopy.kind}</th>
                <th className="px-3 py-2.5 text-start font-medium">{mcCopy.sentAt}</th>
                <th className="px-3 py-2.5 text-start font-medium">{mcCopy.status}</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <LogRow key={m.id} entry={m} expanded={expanded === m.id} onToggle={() => setExpanded(expanded === m.id ? null : m.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LogRow({ entry, expanded, onToggle }: { entry: MessageLogEntry; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={clsx('cursor-pointer border-t border-line hover:bg-primary-soft/30', expanded && 'bg-primary-soft/30')} onClick={onToggle}>
        <td className="px-3 py-2 text-ink">{entry.recipient}</td>
        <td className="max-w-72 truncate px-3 py-2 font-medium text-ink">{entry.subject}</td>
        <td className="px-3 py-2">
          <Badge tone={entry.kind === 'LECTURE_REMINDER' ? 'primary' : entry.kind === 'LECTURE_THANK_YOU' ? 'success' : 'neutral'}>
            {entry.kind === 'LECTURE_REMINDER' ? messageCenter.reminderSent : entry.kind === 'LECTURE_THANK_YOU' ? messageCenter.thankYouSent : mcCopy.other}
          </Badge>
        </td>
        <td className="tnum px-3 py-2 text-ink-muted">
          {formatDateHe(entry.sentAt.slice(0, 10))} {entry.sentAt.slice(11, 16)}
        </td>
        <td className="px-3 py-2">
          <Badge tone={entry.status === 'SENT' ? 'success' : entry.status === 'FAILED' ? 'danger' : 'warning'}>
            {entry.status === 'SENT' ? mcCopy.sent : entry.status === 'FAILED' ? mcCopy.failed : mcCopy.pending}
          </Badge>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-line bg-neutral-block/40">
          <td colSpan={5} className="px-5 py-3">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink">{entry.body}</pre>
          </td>
        </tr>
      ) : null}
    </>
  )
}
