import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReschedulingSuggestion, ScheduleConflict } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import {
  buttons,
  conflictCenter,
  conflictSeverityLabels,
  emptyStates,
  nav,
  statusLabels
} from '@/lib/hebrewCopy'
import { useDraftSchedule, useSelectedTraining } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { detectConflicts, buildSuggestions } from '@/features/scheduling-engine'
import { removeDraftEvent } from '@/data/services/scheduleService'
import { formatDateHe } from '@/lib/time'
import { autoMoveToNearestFreeSlot } from './autoFix'
import { conflictCopy } from './copy'

const severityTone = { BLOCKING: 'danger', WARNING: 'warning', INFO: 'neutral' } as const

export function ConflictCenterPage() {
  const navigate = useNavigate()
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const lecturers = useDb((s) => s.lecturers)
  const [feedback, setFeedback] = useState<string | null>(null)

  const { conflicts, suggestions } = useMemo(() => {
    if (!training || !draft) return { conflicts: [] as ScheduleConflict[], suggestions: [] as ReschedulingSuggestion[] }
    const detected = detectConflicts({
      events: draft.events,
      training,
      settings: training.settings,
      lecturers,
      lockedDates: draft.lockedDates
    })
    const built = buildSuggestions({
      conflicts: detected,
      impossibleItems: [],
      events: draft.events,
      hasGuestReserve: draft.events.some((e) => e.title === 'זמן שמור להרצאות חוץ')
    })
    return { conflicts: detected, suggestions: built }
  }, [training, draft, lecturers])

  const counts = useMemo(
    () => ({
      blocking: conflicts.filter((c) => c.severity === 'BLOCKING').length,
      warning: conflicts.filter((c) => c.severity === 'WARNING').length,
      info: conflicts.filter((c) => c.severity === 'INFO').length
    }),
    [conflicts]
  )

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.conflictCenter} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  async function applySuggestion(suggestion: ReschedulingSuggestion) {
    if (!training || !draft) return
    for (const action of suggestion.actions) {
      if (action.kind === 'MOVE_EVENT' && action.eventId) {
        const moved = await autoMoveToNearestFreeSlot(training, draft, action.eventId)
        if (moved) {
          const event = draft.events.find((e) => e.id === action.eventId)
          setFeedback(conflictCopy.applied(event?.title ?? '', formatDateHe(moved.date), moved.startTime))
        } else {
          setFeedback(conflictCopy.applyFailed)
        }
      } else if (action.kind === 'REMOVE_EVENT' && action.eventId) {
        const event = draft.events.find((e) => e.id === action.eventId)
        if (event && window.confirm(conflictCopy.removeConfirm(event.title))) {
          await removeDraftEvent(training.id, action.eventId)
          setFeedback(null)
        }
      } else if (action.kind === 'MANUAL_RESOLVE') {
        navigate('/schedule')
      } else {
        setFeedback(conflictCopy.availableInBuilder)
      }
    }
  }

  return (
    <div>
      <PageHeader
        title={nav.conflictCenter}
        subtitle={training.name}
        actions={
          <div className="flex items-center gap-2 text-sm">
            <Badge tone="danger">{counts.blocking} {conflictSeverityLabels.BLOCKING}</Badge>
            <Badge tone="warning">{counts.warning} {conflictSeverityLabels.WARNING}</Badge>
            <Badge tone="neutral">{counts.info} {conflictSeverityLabels.INFO}</Badge>
          </div>
        }
      />

      {feedback ? (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-primary-soft px-4 py-2.5 text-sm text-primary-hover">
          <span>{feedback}</span>
          <Button variant="ghost" size="sm" onClick={() => setFeedback(null)}>
            {buttons.close}
          </Button>
        </div>
      ) : null}

      {conflicts.length === 0 ? (
        <EmptyState
          message={emptyStates.noConflicts}
          action={
            <Button variant="secondary" onClick={() => navigate('/schedule')}>
              {conflictCopy.openBuilder}
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => {
            const related = suggestions.filter((s) => conflict.suggestedResolutionIds.includes(s.id))
            const involved = conflict.eventIds
              .map((id) => draft?.events.find((e) => e.id === id))
              .filter((e): e is NonNullable<typeof e> => Boolean(e))
            return (
              <div key={conflict.id} className="card-tex p-5">
                <div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={severityTone[conflict.severity]}>
                        {conflictSeverityLabels[conflict.severity]}
                      </Badge>
                      <h2 className="text-[18px] font-semibold text-ink">{conflict.title}</h2>
                      {conflict.canOverride ? null : (
                        <Badge tone="neutral">{conflictCenter.requiresManualApproval}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[15px] text-ink-muted">{conflict.description}</p>

                    {involved.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs text-ink-muted">{conflictCopy.involvedEvents}:</span>
                        {involved.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => navigate('/schedule')}
                            className="focus-ring tnum rounded-lg bg-neutral-block px-2 py-0.5 text-xs text-ink hover:bg-primary-soft"
                          >
                            {e.title} ({formatDateHe(e.date)} {e.startTime})
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {related.length > 0 ? (
                      <div className="mt-3 space-y-2 border-t border-line pt-3">
                        <h3 className="text-xs font-semibold text-ink-muted">
                          {conflictCenter.suggestions}
                        </h3>
                        {related.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel-solid px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {s.recommended ? (
                                  <Badge tone="primary">{statusLabels.recommended}</Badge>
                                ) : (
                                  <Badge tone="neutral">{conflictCenter.anotherOption}</Badge>
                                )}
                                <span className="text-sm font-medium text-ink">{s.title}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                {s.description} — {s.impactSummary}
                              </p>
                            </div>
                            <Button
                              variant={s.recommended ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => void applySuggestion(s)}
                            >
                              {s.recommended ? buttons.applyRecommended : buttons.confirm}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
