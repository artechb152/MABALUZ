import { useMemo, useState, type CSSProperties } from 'react'
import type { ScheduleEvent } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { Toggle } from '@/components/Toggle'
import { Icon } from '@/assets/icons/Icon'
import { eventTypeLabels, generic, nav } from '@/lib/hebrewCopy'
import { useMyTrainings, usePublishedSchedule } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { addDaysISO, formatDateHe, todayISO, weekStartISO } from '@/lib/time'
import { ScheduleLegend, WeekGrid } from './WeekGrid'
import { soldierCopy } from './copy'

export function SoldierSchedulePage() {
  const training = useMyTrainings()[0] ?? null
  const published = usePublishedSchedule(training)
  const toggles = useDb((s) => s.toggles)
  const sharedGroups = useDb((s) => s.sharedGroups)
  const allTrainings = useDb((s) => s.trainings)
  const currentWeek = weekStartISO(todayISO())
  const [weekStart, setWeekStart] = useState(currentWeek)
  const [selected, setSelected] = useState<ScheduleEvent | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  // Training names a shared block/lecture is shared with (excluding this training).
  const sharedWith = useMemo(() => {
    if (!selected?.sharedGroupId) return []
    const group = sharedGroups.find((g) => g.id === selected.sharedGroupId)
    if (!group) return []
    return group.linkedTrainingIds
      .filter((id) => id !== training?.id)
      .map((id) => allTrainings.find((t) => t.id === id)?.name ?? '')
      .filter(Boolean)
  }, [selected, sharedGroups, allTrainings, training])

  const canSeeNextWeek =
    (training?.settings.allowSoldiersToSeeNextWeek ?? false) && toggles.enableSoldierNextWeekView
  const maxWeek = canSeeNextWeek ? addDaysISO(currentWeek, 7) : currentWeek

  const visibleEvents = useMemo(
    () => (published?.events ?? []).filter((e) => e.visibleToSoldiers),
    [published]
  )

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.mySchedule} />
        <EmptyState message={soldierCopy.noPublished} />
      </div>
    )
  }

  const atMaxWeek = weekStart >= maxWeek
  const atMinWeek = weekStart <= currentWeek

  return (
    // Fills the viewport: the page itself never scrolls, the grid scrolls inside.
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-stretch justify-between gap-4">
        <div className="shrink-0">
          {/* Title: "הלו״ז שלי - <training>" — same size, training name lighter. */}
          <h1 className="t-display">
            {nav.mySchedule}
            <span className="font-light text-ink-muted"> - {training.name}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="week-nav-btn"
                disabled={atMinWeek}
                onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
                aria-label="שבוע קודם"
              >
                <Icon name="chevron-right" size={16} />
              </button>
              <span className="tnum min-w-[150px] text-center text-[18px] font-normal text-ink-muted">
                {generic.week}: {formatDateHe(weekStart)}
              </span>
              <button
                type="button"
                className="week-nav-btn"
                disabled={atMaxWeek}
                onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
                aria-label="שבוע הבא"
              >
                <Icon name="chevron-left" size={16} />
              </button>
            </div>
            {!canSeeNextWeek ? (
              <span className="t-detail text-ink-muted">{soldierCopy.nextWeekBlocked}</span>
            ) : null}
          </div>
        </div>

        {/* Latest commander note, stretched across the middle. Click to read the
            full text; a long note is clamped to two lines with an ellipsis. */}
        {published?.commanderNote ? (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="focus-ring flex min-w-[220px] flex-1 flex-col justify-center gap-1 rounded-2xl border border-primary/25 bg-primary-soft/50 px-5 py-3 text-right shadow-card transition-colors hover:bg-primary-soft"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
              <span className="text-[15px] font-semibold text-primary-hover">{soldierCopy.commanderNote}</span>
            </span>
            <span className="line-clamp-2 text-[16px] leading-snug text-ink">{published.commanderNote}</span>
          </button>
        ) : null}

        {/* Colour guide in its own card, textured with thick slanted lines across
            the whole field (no fade). */}
        <div className="relative flex shrink-0 items-center overflow-hidden rounded-2xl border border-line bg-panel-solid p-4 shadow-card">
          <span className="tex-lines" style={{ '--tex-fg': 'rgba(79,70,229,0.14)' } as CSSProperties} />
          <div className="relative z-10 w-full">
            <ScheduleLegend events={visibleEvents} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {published ? (
          <WeekGrid
            events={visibleEvents}
            weekStart={weekStart}
            settings={training.settings}
            editable={false}
            hideHardIndicators
            onEventClick={setSelected}
          />
        ) : (
          <EmptyState message={soldierCopy.noPublished} />
        )}
      </div>

      <Modal
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? soldierCopy.detailsTitle}
        size="md"
      >
        {selected ? <SoldierEventDetails event={selected} sharedWith={sharedWith} /> : null}
      </Modal>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title={soldierCopy.commanderNote} size="md">
        <p className="t-body whitespace-pre-line leading-relaxed text-ink">{published?.commanderNote}</p>
      </Modal>
    </div>
  )
}

function SoldierEventDetails({ event, sharedWith }: { event: ScheduleEvent; sharedWith: string[] }) {
  const basicOnly = event.showBasicDetailsOnly
  const isGibush = event.title.includes('גיבוש')
  return (
    <div className="space-y-3 t-body">
      <div className="flex items-center gap-2">
        <Badge tone="primary">{eventTypeLabels[event.type]}</Badge>
        <span className="tnum text-ink-muted">
          {formatDateHe(event.date)} | {event.isFullDay ? 'יום מלא' : `${event.startTime}-${event.endTime}`}
        </span>
      </div>
      {sharedWith.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl bg-primary-soft px-3 py-2 text-primary-hover">
          <Icon name="link" size={15} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">{soldierCopy.sharedWith}: </span>
            {sharedWith.join(', ')}
          </span>
        </div>
      ) : null}
      {event.location ? (
        <div className="flex items-center gap-2 text-ink">
          <Icon name="location" size={15} className="text-ink-muted" />
          {event.location}
        </div>
      ) : null}
      {!basicOnly ? (
        <>
          {event.shortDescription ? <p className="text-ink">{event.shortDescription}</p> : null}
          {event.instructorName ? (
            <div className="flex items-center gap-2 text-ink">
              <Icon name="guest-lecturer" size={15} className="text-ink-muted" />
              {event.instructorName}
            </div>
          ) : null}
          {event.equipment && event.equipment.length > 0 ? (
            <div>
              <span className="font-medium text-ink">{generic.equipment}: </span>
              <span className="text-ink-muted">{event.equipment.join(', ')}</span>
            </div>
          ) : null}
          {event.soldierNotes ? (
            <div className="rounded-xl bg-neutral-block px-3 py-2 text-ink-muted">
              {event.soldierNotes}
            </div>
          ) : null}
        </>
      ) : null}
      {isGibush ? (
        <div className="flex items-center gap-2 border-t border-line pt-3">
          <Toggle checked={false} onChange={() => undefined} disabled label={soldierCopy.attendanceSoon} />
        </div>
      ) : null}
    </div>
  )
}
