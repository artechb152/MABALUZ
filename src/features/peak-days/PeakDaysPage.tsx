import { useMemo, useState } from 'react'
import type { ScheduleEvent } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { buttons, emptyStates, nav, peakDays, statusLabels } from '@/lib/hebrewCopy'
import { useDraftSchedule, usePublishedSchedule, useSelectedTraining } from '@/app/hooks'
import { removeDraftEvent } from '@/data/services/scheduleService'
import { formatDateHe } from '@/lib/time'
import { PeakDayModal } from './PeakDayModal'
import { peakCopy } from './copy'

export function PeakDaysPage() {
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const published = usePublishedSchedule(training)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleEvent | null>(null)

  const peakEvents = useMemo(
    () =>
      (draft?.events ?? [])
        .filter((e) => e.type === 'PEAK_DAY')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [draft]
  )

  const publishedKeys = useMemo(
    () =>
      new Set(
        (published?.events ?? []).filter((e) => e.type === 'PEAK_DAY').map((e) => `${e.title}|${e.date}`)
      ),
    [published]
  )

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.peakDays} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={nav.peakDays}
        subtitle={peakDays.fullDayNote}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            {buttons.addPeakDay}
          </Button>
        }
      />

      {peakEvents.length === 0 ? (
        <EmptyState message={emptyStates.noPeakDays} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {peakEvents.map((e) => {
            const isPublished = publishedKeys.has(`${e.title}|${e.date}`)
            return (
              <div key={e.id} className="card-tex p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[22px] font-semibold text-ink">{e.title}</h2>
                    <p className="tnum mt-0.5 text-[14px] text-ink-muted">
                      {formatDateHe(e.date)} | {statusLabels.fullDay}
                    </p>
                  </div>
                  <Badge tone={isPublished ? 'success' : 'warning'}>
                    {isPublished ? statusLabels.published : statusLabels.draft}
                  </Badge>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2 text-[14px]">
                  {e.shortDescription ? <Badge tone="primary">{e.shortDescription}</Badge> : null}
                  {e.location ? <span className="text-ink-muted">{e.location}</span> : null}
                  <Badge tone={e.visibleToSoldiers ? 'success' : 'neutral'}>
                    {e.visibleToSoldiers ? statusLabels.visibleToSoldiers : statusLabels.hiddenFromSoldiers}
                  </Badge>
                  {e.showBasicDetailsOnly ? <Badge tone="neutral">{peakCopy.basicOnly}</Badge> : null}
                </div>

                {e.commanderNotes ? (
                  <p className="mb-3 rounded-xl bg-neutral-block px-3 py-2 text-sm text-ink-muted">
                    {e.commanderNotes}
                  </p>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditing(e)
                      setModalOpen(true)
                    }}
                  >
                    {buttons.edit}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(peakCopy.deleteConfirm) && training) {
                        void removeDraftEvent(training.id, e.id)
                      }
                    }}
                  >
                    {buttons.delete}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen ? (
        <PeakDayModal training={training} event={editing} onClose={() => setModalOpen(false)} />
      ) : null}
    </div>
  )
}
