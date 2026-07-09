import { useMemo, useState } from 'react'
import type { Schedule, Training } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, TextArea, Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { buttons, conflictSeverityLabels, statusLabels, warnings } from '@/lib/hebrewCopy'
import { detectConflicts, buildImpactReport } from '@/features/scheduling-engine'
import { publishDraft } from '@/data/services/scheduleService'
import { useCurrentUser } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { ImpactReportView } from '@/features/conflict-center/ImpactReportView'
import { publishCopy } from './copy'

interface PublishFlowProps {
  open: boolean
  onClose: () => void
  training: Training
  draft: Schedule
  published: Schedule | null
}

export function PublishFlow({ open, onClose, training, draft, published }: PublishFlowProps) {
  const user = useCurrentUser()
  const { users, trainings, sharedGroups } = useDb()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [override, setOverride] = useState(false)
  const [changeSummary, setChangeSummary] = useState('')
  const [commanderNote, setCommanderNote] = useState('')

  const conflicts = useMemo(
    () =>
      open
        ? detectConflicts({
            events: draft.events,
            training,
            settings: training.settings,
            lockedDates: draft.lockedDates
          })
        : [],
    [open, draft, training]
  )
  const blocking = conflicts.filter((c) => c.severity === 'BLOCKING')
  const nonBlocking = conflicts.filter((c) => c.severity !== 'BLOCKING')

  const report = useMemo(
    () =>
      open
        ? buildImpactReport({
            summary: 'השוואת הטיוטה מול הלו״ז שפורסם.',
            trainingId: training.id,
            before: published?.events ?? [],
            after: draft.events,
            conflictsCreated: blocking,
            allTrainings: trainings,
            allUsers: users,
            sharedGroups
          })
        : null,
    [open, draft, published, training, trainings, users, sharedGroups, blocking]
  )

  function reset() {
    setStep(1)
    setOverride(false)
    setChangeSummary('')
    setCommanderNote('')
  }

  const [publishing, setPublishing] = useState(false)

  async function handlePublish() {
    if (!user) return
    setPublishing(true)
    try {
      await publishDraft(training.id, {
        publishedBy: user.id,
        changeSummary: changeSummary.trim() || undefined,
        commanderNote: commanderNote.trim() || undefined
      })
      setStep(4)
    } finally {
      setPublishing(false)
    }
  }

  const canContinueFromConflicts = blocking.length === 0 || override

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={publishCopy.title}
      subtitle={`${publishCopy.step1} ← ${publishCopy.step2} ← ${publishCopy.step3}`}
      size="xl"
      footer={
        step === 4 ? (
          <Button
            onClick={() => {
              reset()
              onClose()
            }}
          >
            {buttons.close}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
                {buttons.previous}
              </Button>
            ) : null}
            {step === 1 ? (
              <Button disabled={!canContinueFromConflicts} onClick={() => setStep(2)}>
                {buttons.next}
              </Button>
            ) : step === 2 ? (
              <Button onClick={() => setStep(3)}>{buttons.next}</Button>
            ) : (
              <Button variant="publish" loading={publishing} onClick={() => void handlePublish()}>
                {buttons.publish}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              {buttons.cancel}
            </Button>
          </div>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          {blocking.length === 0 ? (
            <div className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
              {publishCopy.noBlocking}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="whitespace-pre-line rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                {warnings.unresolvedConflictsOnPublish}
              </div>
              <ul className="space-y-2">
                {blocking.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <Badge tone="danger">{conflictSeverityLabels[c.severity]}</Badge>
                    <div>
                      <div className="font-medium text-ink">{c.title}</div>
                      <div className="text-ink-muted">{c.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft/50 px-4 py-3 text-sm text-danger">
                <input
                  type="checkbox"
                  checked={override}
                  onChange={(e) => setOverride(e.target.checked)}
                  className="h-4 w-4"
                />
                {publishCopy.overrideLabel}
              </label>
            </div>
          )}
          {nonBlocking.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">{publishCopy.warningsInfo}</p>
              <ul className="space-y-1.5">
                {nonBlocking.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm">
                    <Badge tone={c.severity === 'WARNING' ? 'warning' : 'neutral'}>
                      {conflictSeverityLabels[c.severity]}
                    </Badge>
                    <span className="text-ink-muted">{c.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 && report ? <ImpactReportView report={report} /> : null}

      {step === 3 ? (
        <div className="space-y-4">
          <Field label={publishCopy.changeSummaryLabel}>
            <TextArea value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} />
          </Field>
          <Field label={publishCopy.commanderNoteLabel}>
            <Input value={commanderNote} onChange={(e) => setCommanderNote(e.target.value)} />
          </Field>
          <p className="text-xs text-ink-muted">{publishCopy.soldierPreviewHint}</p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
            <Badge tone="success">{statusLabels.published}</Badge>
          </span>
          <p className="text-sm text-ink">{publishCopy.publishSuccess}</p>
        </div>
      ) : null}
    </Modal>
  )
}
