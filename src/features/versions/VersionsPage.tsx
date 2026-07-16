import { useMemo, useState } from 'react'
import type { Schedule } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { buttons, emptyStates, nav, statusLabels, versions, warnings } from '@/lib/hebrewCopy'
import { useCurrentUser, useSelectedTraining } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import {
  discardDraft,
  isRevertSafe,
  revertToVersion
} from '@/data/services/scheduleService'
import { buildImpactReport } from '@/features/scheduling-engine'
import { formatDateHe } from '@/lib/time'
import { ImpactReportView } from '@/features/conflict-center/ImpactReportView'
import { versionsCopy } from '@/features/conflict-center/copy'
import { clsx } from 'clsx'

interface VersionRow {
  schedule: Schedule
  label: string
  tone: 'primary' | 'success' | 'neutral'
  kind: 'DRAFT' | 'CURRENT' | 'PREVIOUS'
}

export function VersionsPage() {
  const user = useCurrentUser()
  const training = useSelectedTraining()
  const { schedules, users } = useDb()
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)

  const rows: VersionRow[] = useMemo(() => {
    if (!training) return []
    const find = (id?: string) => schedules.find((s) => s.id === id)
    const list: VersionRow[] = []
    const draft = find(training.draftScheduleId)
    if (draft) list.push({ schedule: draft, label: statusLabels.draft, tone: 'primary', kind: 'DRAFT' })
    const published = find(training.publishedScheduleId)
    if (published)
      list.push({ schedule: published, label: statusLabels.currentVersion, tone: 'success', kind: 'CURRENT' })
    training.previousPublishedScheduleIds.forEach((id, i) => {
      const s = find(id)
      if (s)
        list.push({
          schedule: s,
          label: i === 0 ? statusLabels.previousVersion : statusLabels.twoVersionsAgo,
          tone: 'neutral',
          kind: 'PREVIOUS'
        })
    })
    return list
  }, [training, schedules])

  const published = rows.find((r) => r.kind === 'CURRENT')?.schedule ?? null

  const compareReport = useMemo(() => {
    if (compareIds.length !== 2 || !training) return null
    const a = rows.find((r) => r.schedule.id === compareIds[0])?.schedule
    const b = rows.find((r) => r.schedule.id === compareIds[1])?.schedule
    if (!a || !b) return null
    const [older, newer] = a.versionNumber <= b.versionNumber ? [a, b] : [b, a]
    return buildImpactReport({
      summary: `${versionsCopy.compareTitle}: גרסה ${older.versionNumber} מול גרסה ${newer.versionNumber}.`,
      trainingId: training.id,
      before: older.events,
      after: newer.events
    })
  }, [compareIds, rows, training])

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.versions} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  function toggleCompare(id: string) {
    setCompareIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids.slice(-1), id]
    )
  }

  async function handleRevert(target: Schedule) {
    if (!training || !user) return
    if (!window.confirm(versionsCopy.revertConfirm)) return
    const result = await revertToVersion(training.id, target.id, user.id)
    setFeedback(result.ok ? versionsCopy.reverted : versionsCopy.unsafeRevert)
  }

  return (
    <div>
      <PageHeader title={nav.versions} subtitle={training.name} />

      {feedback ? (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-primary-soft px-4 py-2.5 text-sm text-primary-hover">
          <span>{feedback}</span>
          <Button variant="ghost" size="sm" onClick={() => setFeedback(null)}>
            {buttons.close}
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState message={emptyStates.noVersions} />
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-muted">{versionsCopy.compareHint}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map(({ schedule, label, tone, kind }) => {
              const publisher = users.find((u) => u.id === schedule.publishedBy)
              const safe = kind === 'PREVIOUS' ? isRevertSafe(published, schedule) : true
              const selected = compareIds.includes(schedule.id)
              return (
                <div key={schedule.id} className={clsx('card-tex p-5', selected && 'ring-2 ring-primary')}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[18px] font-semibold text-ink">
                          {versions.versionNumber} {schedule.versionNumber}
                        </h2>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <p className="tnum mt-0.5 text-[14px] text-ink-muted">
                        {versionsCopy.eventsCount(schedule.events.length)}
                        {schedule.publishedAt
                          ? ` | ${versions.publishedAt}: ${formatDateHe(schedule.publishedAt.slice(0, 10))}`
                          : ''}
                        {publisher ? ` | ${versions.publishedBy}: ${publisher.displayName}` : ''}
                      </p>
                    </div>
                  </div>

                  {schedule.changeSummary ? (
                    <p className="mb-2 text-sm text-ink">
                      <span className="font-medium">{versions.changeSummary}: </span>
                      {schedule.changeSummary}
                    </p>
                  ) : null}
                  {schedule.commanderNote ? (
                    <p className="mb-2 rounded-xl bg-neutral-block px-3 py-2 text-sm text-ink-muted">
                      {versions.commanderNote}: {schedule.commanderNote}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleCompare(schedule.id)}>
                      {selected ? versionsCopy.selectedForCompare : versionsCopy.selectForCompare}
                    </Button>
                    {kind === 'DRAFT' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(versionsCopy.discardDraftConfirm)) {
                            void discardDraft(training.id)
                          }
                        }}
                      >
                        {buttons.discardChanges}
                      </Button>
                    ) : null}
                    {kind === 'PREVIOUS' ? (
                      safe ? (
                        <Button variant="secondary" size="sm" onClick={() => void handleRevert(schedule)}>
                          {buttons.revert}
                        </Button>
                      ) : (
                        <span className="text-[14px] text-ink-muted" title={warnings.unsafeRollback}>
                          {versionsCopy.unsafeRevert}
                        </span>
                      )
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {compareReport ? (
            <div className="card-tex mt-6 p-5">
              <h2 className="mb-4 text-lg font-bold text-ink">{versionsCopy.compareTitle}</h2>
              <ImpactReportView report={compareReport} />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
