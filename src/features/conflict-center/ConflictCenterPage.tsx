import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReschedulingSuggestion, ScheduleConflict } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Icon } from '@/assets/icons/Icon'
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

// UI preference only (not app data): remembers "don't show the explainer again".
const CONFLICT_HELP_KEY = 'mabaluz.conflicts-help.hidden'

export function ConflictCenterPage() {
  const navigate = useNavigate()
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const lecturers = useDb((s) => s.lecturers)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(() => {
    try {
      return localStorage.getItem(CONFLICT_HELP_KEY) !== '1'
    } catch {
      return true
    }
  })

  function dismissHelp(forever: boolean) {
    if (forever) {
      try {
        localStorage.setItem(CONFLICT_HELP_KEY, '1')
      } catch {
        /* ignore storage errors */
      }
    }
    setShowHelp(false)
  }

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
      {showHelp ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/25 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => dismissHelp(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-line bg-panel-solid p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => dismissHelp(false)}
              aria-label={buttons.close}
              className="focus-ring absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-neutral-block hover:text-ink"
            >
              <Icon name="close" size={18} />
            </button>
            <h2 className="pe-8 text-[20px] font-semibold text-ink">{conflictCopy.helpTitle}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{conflictCopy.helpIntro}</p>
            <div className="mt-4 space-y-2.5">
              {[
                { tone: 'danger' as const, title: conflictCopy.helpBlockingTitle, text: conflictCopy.helpBlocking },
                { tone: 'warning' as const, title: conflictCopy.helpWarningTitle, text: conflictCopy.helpWarning },
                { tone: 'neutral' as const, title: conflictCopy.helpInfoTitle, text: conflictCopy.helpInfo }
              ].map((row) => (
                <div key={row.title} className="flex items-start gap-3 rounded-xl border border-line bg-background/50 p-3">
                  <span className="shrink-0">
                    <Badge tone={row.tone}>{row.title}</Badge>
                  </span>
                  <p className="text-[14px] leading-relaxed text-ink">{row.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => dismissHelp(true)}
                className="focus-ring rounded-lg px-2 py-1 text-[14px] font-medium text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                {conflictCopy.helpDontShow}
              </button>
              <Button variant="primary" onClick={() => dismissHelp(false)}>
                {conflictCopy.helpGotIt}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <PageHeader
        title={nav.conflictCenter}
        subtitle={training.name}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge tone="danger">{counts.blocking} {conflictSeverityLabels.BLOCKING}</Badge>
              <Badge tone="warning">{counts.warning} {conflictSeverityLabels.WARNING}</Badge>
              <Badge tone="neutral">{counts.info} {conflictSeverityLabels.INFO}</Badge>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel-solid px-3 py-1.5 text-[13px] font-medium text-ink-muted shadow-sm transition-colors hover:bg-neutral-block hover:text-ink"
            >
              <Icon name="faq" size={16} />
              {conflictCopy.helpReopen}
            </button>
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
