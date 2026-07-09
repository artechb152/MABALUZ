import { useState } from 'react'
import type { Schedule, ScheduleGenerationOutput, Training } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { buttons, statusLabels } from '@/lib/hebrewCopy'
import { generateSchedule } from '@/features/scheduling-engine'
import { replaceDraft } from '@/data/services/scheduleService'
import { useDb } from '@/app/dbStore'
import { generateCopy } from './copy'

interface GenerateFlowProps {
  open: boolean
  onClose: () => void
  training: Training
  draft: Schedule
}

export function GenerateFlow({ open, onClose, training, draft }: GenerateFlowProps) {
  const importedTemplates = useDb((s) => s.importedTemplates)
  const [output, setOutput] = useState<ScheduleGenerationOutput | null>(null)
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)

  const template = importedTemplates.find((t) => t.trainingId === training.id) ?? null

  function runGeneration() {
    const events = draft.events
    const shared = events.filter((e) => e.type === 'SHARED')
    const peaks = events.filter((e) => e.type === 'PEAK_DAY')
    const guests = events.filter((e) => e.type === 'GUEST_LECTURE')
    const otherHard = events.filter(
      (e) => e.isLocked && !['SHARED', 'PEAK_DAY', 'GUEST_LECTURE'].includes(e.type)
    )
    const manualFlexible = events.filter(
      (e) => !e.isLocked && e.type !== 'MEAL_BREAK' && e.createdBy !== 'engine' && e.createdBy !== 'seed'
    )

    const result = generateSchedule({
      training,
      importedTrainingTemplate: template,
      existingDraftEvents: events,
      hardEvents: otherHard,
      knownGuestLectures: guests,
      sharedEvents: shared,
      peakDays: peaks,
      manualFlexibleEvents: manualFlexible,
      settings: training.settings
    })
    setOutput(result)
  }

  async function applyToDraft() {
    if (!output) return
    setApplying(true)
    try {
      await replaceDraft(training.id, {
        ...output.schedule,
        id: draft.id,
        versionNumber: draft.versionNumber,
        lockedDates: draft.lockedDates,
        events: output.schedule.events.map((e) => ({ ...e, scheduleId: draft.id }))
      })
      setApplied(true)
    } finally {
      setApplying(false)
    }
  }

  function reset() {
    setOutput(null)
    setApplied(false)
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={generateCopy.title}
      subtitle={template ? generateCopy.usingTemplate : generateCopy.noTemplate}
      size="xl"
      footer={
        applied ? (
          <Button
            onClick={() => {
              reset()
              onClose()
            }}
          >
            {buttons.close}
          </Button>
        ) : output ? (
          <div className="flex items-center gap-2">
            <Button loading={applying} onClick={() => void applyToDraft()}>
              {generateCopy.apply}
            </Button>
            <Button variant="ghost" onClick={reset}>
              {buttons.previous}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={runGeneration}>{buttons.generateSchedule}</Button>
            <Button variant="ghost" onClick={onClose}>
              {buttons.cancel}
            </Button>
          </div>
        )
      }
    >
      {!output ? (
        <p className="py-4 text-sm text-ink-muted">{generateCopy.intro}</p>
      ) : applied ? (
        <div className="py-8 text-center">
          <Badge tone="success">{statusLabels.draft}</Badge>
          <p className="mt-3 text-sm text-ink">{generateCopy.applied}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label={generateCopy.eventsPlaced} value={output.schedule.events.length} tone="primary" />
            <StatCard
              label={generateCopy.conflictsCount}
              value={output.conflicts.length}
              tone={output.conflicts.some((c) => c.severity === 'BLOCKING') ? 'danger' : 'neutral'}
            />
            <StatCard
              label={generateCopy.impossibleTitle}
              value={output.impossibleItems.length}
              tone={output.impossibleItems.length > 0 ? 'warning' : 'neutral'}
            />
          </div>

          {output.impossibleItems.length > 0 ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink">{generateCopy.impossibleTitle}</h3>
              <ul className="space-y-1.5">
                {output.impossibleItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <Badge tone="danger">{statusLabels.unschedulable}</Badge>
                    <span className="font-medium text-ink">{item.title}</span>
                    <span className="tnum text-ink-muted">({item.durationMinutes} דק׳)</span>
                    <span className="text-ink-muted">— {item.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {output.suggestions.length > 0 ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink">{generateCopy.suggestionsTitle}</h3>
              <div className="space-y-2">
                {output.suggestions.map((s) => (
                  <div key={s.id} className="rounded-xl border border-line bg-panel-solid px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.recommended ? <Badge tone="primary">{statusLabels.recommended}</Badge> : null}
                      <span className="text-sm font-semibold text-ink">{s.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{s.description}</p>
                    <p className="mt-1 text-xs text-ink-muted">{s.impactSummary}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {output.warnings.length > 0 ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink">{generateCopy.warningsTitle}</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-ink-muted">
                {output.warnings.map((w) => (
                  <li key={w.id}>
                    {w.title} — {w.description}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

function StatCard(props: { label: string; value: number; tone: 'primary' | 'danger' | 'warning' | 'neutral' }) {
  const toneClass =
    props.tone === 'primary'
      ? 'text-primary-hover'
      : props.tone === 'danger'
        ? 'text-danger'
        : props.tone === 'warning'
          ? 'text-warning'
          : 'text-ink'
  return (
    <div className="rounded-xl border border-line bg-panel-solid px-4 py-3 text-center">
      <div className={`tnum text-2xl font-bold ${toneClass}`}>{props.value}</div>
      <div className="mt-0.5 text-xs text-ink-muted">{props.label}</div>
    </div>
  )
}
