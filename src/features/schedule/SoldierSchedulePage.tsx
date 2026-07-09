import { useMemo, useState } from 'react'
import type { ScheduleEvent } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { Toggle } from '@/components/Toggle'
import { Icon } from '@/assets/icons/Icon'
import { eventTypeLabels, generic, nav } from '@/lib/hebrewCopy'
import { useMyTrainings, usePublishedSchedule } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { addDaysISO, formatDateHe, todayISO, weekStartISO } from '@/lib/time'
import { WeekGrid } from './WeekGrid'
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
    <div>
      {/* Commander note now lives as a pop-up under the sidebar's הלו״ז שלי item. */}
      <PageHeader title={nav.mySchedule} subtitle={training.name} />

      <div className="mb-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={atMinWeek}
          onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
          aria-label="שבוע קודם"
        >
          <Icon name="chevron-right" size={16} />
        </Button>
        <span className="tnum t-body font-light text-ink-muted">
          {generic.week}: {formatDateHe(weekStart)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={atMaxWeek}
          onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
          aria-label="שבוע הבא"
        >
          <Icon name="chevron-left" size={16} />
        </Button>
        {!canSeeNextWeek ? (
          <span className="t-detail text-ink-muted">{soldierCopy.nextWeekBlocked}</span>
        ) : null}
      </div>

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

      <Modal
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.title ?? soldierCopy.detailsTitle}
        size="md"
      >
        {selected ? <SoldierEventDetails event={selected} sharedWith={sharedWith} /> : null}
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
