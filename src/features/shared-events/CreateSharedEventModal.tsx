import { useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { buttons, generic, sharedEvents, warnings } from '@/lib/hebrewCopy'
import { useCurrentUser, useSelectedTraining } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { createSharedEvent } from '@/data/services/sharedEventService'
import { timeRangesOverlap } from '@/lib/time'
import { sharedCopy } from './copy'
import { clsx } from 'clsx'

interface CreateSharedEventModalProps {
  open: boolean
  onClose: () => void
}

export function CreateSharedEventModal({ open, onClose }: CreateSharedEventModalProps) {
  const user = useCurrentUser()
  const myTraining = useSelectedTraining()
  const { trainings, schedules } = useDb()

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [location, setLocation] = useState('')
  const [search, setSearch] = useState('')
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const [step, setStep] = useState<'form' | 'overlap' | 'done'>('form')
  const [error, setError] = useState<string | null>(null)

  const candidates = useMemo(
    () =>
      trainings
        .filter((t) => t.status === 'ACTIVE' && t.base === 'בה״ד 15' && t.id !== myTraining?.id)
        .filter(
          (t) => !search.trim() || t.name.includes(search.trim()) || t.symbol.includes(search.trim())
        ),
    [trainings, myTraining, search]
  )

  const overlaps = useMemo(() => {
    if (!date || !myTraining) return []
    const allIds = [myTraining.id, ...linkedIds]
    const result: { trainingName: string; titles: string[] }[] = []
    for (const tid of allIds) {
      const training = trainings.find((t) => t.id === tid)
      const draft = schedules.find((s) => s.id === training?.draftScheduleId)
      const clashing = (draft?.events ?? [])
        .filter((e) => e.date === date && timeRangesOverlap(e.startTime, e.endTime, startTime, endTime))
        .map((e) => e.title)
      if (clashing.length > 0) result.push({ trainingName: training?.name ?? tid, titles: clashing })
    }
    return result
  }, [date, startTime, endTime, linkedIds, myTraining, trainings, schedules])

  function reset() {
    setTitle('')
    setDate('')
    setStartTime('10:00')
    setEndTime('11:00')
    setLocation('')
    setSearch('')
    setLinkedIds([])
    setStep('form')
    setError(null)
  }

  async function submit() {
    if (!user || !myTraining) return
    if (!title.trim() || !date) {
      setError(sharedCopy.eventDetails + ' — ' + generic.required)
      return
    }
    if (step === 'form' && overlaps.length > 0) {
      setStep('overlap')
      return
    }
    await createSharedEvent({
      title: title.trim(),
      date,
      startTime,
      endTime,
      location: location.trim() || undefined,
      createdByUserId: user.id,
      createdByTrainingId: myTraining.id,
      linkedTrainingIds: [myTraining.id, ...linkedIds]
    })
    setStep('done')
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={sharedCopy.createTitle}
      subtitle={warnings.sharedChangeNeedsAllApprovals}
      size="lg"
      footer={
        step === 'done' ? (
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
            <Button onClick={() => void submit()}>
              {step === 'overlap' ? buttons.continueAnyway : buttons.save}
            </Button>
            {step === 'overlap' ? (
              <Button variant="ghost" onClick={() => setStep('form')}>
                {buttons.previous}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              {buttons.cancel}
            </Button>
            {error ? <span className="text-sm text-danger">{error}</span> : null}
          </div>
        )
      }
    >
      {step === 'done' ? (
        <p className="py-6 text-center text-sm text-success">{sharedCopy.created}</p>
      ) : step === 'overlap' ? (
        <div className="space-y-3">
          <div className="whitespace-pre-line rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {warnings.sharedChangeOverridesEvent}
          </div>
          <h3 className="text-sm font-semibold text-ink">{sharedCopy.overlapWarningTitle}</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-muted">
            {overlaps.map((o, i) => (
              <li key={i}>{sharedCopy.overlapIn(o.trainingName, o.titles.join(', '))}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={generic.title} required className="col-span-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </Field>
            <Field label={generic.date} required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={generic.location}>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label={generic.startTime}>
              <Input type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label={generic.endTime}>
              <Input type="time" step={900} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold text-ink">{sharedCopy.linkTrainings}</h3>
            <p className="mb-2 text-xs text-ink-muted">
              {sharedEvents.activeTrainingsInBase} — {sharedCopy.myTrainingAlways}
            </p>
            <Input
              placeholder={sharedEvents.searchTraining}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2"
            />
            <div className="max-h-44 space-y-1.5 overflow-y-auto">
              {myTraining ? (
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-sm">
                  <span className="font-medium text-ink">
                    {myTraining.name} ({myTraining.symbol})
                  </span>
                  <Badge tone="primary">{sharedCopy.myTrainingAlways}</Badge>
                </div>
              ) : null}
              {candidates.map((t) => {
                const checked = linkedIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setLinkedIds((ids) => (checked ? ids.filter((i) => i !== t.id) : [...ids, t.id]))
                    }
                    className={clsx(
                      'focus-ring flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors',
                      checked
                        ? 'border-primary bg-primary-soft'
                        : 'border-line bg-panel-solid hover:border-primary/40'
                    )}
                  >
                    <span className="font-medium text-ink">
                      {t.name} ({t.symbol})
                    </span>
                    <input type="checkbox" readOnly checked={checked} className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
            {linkedIds.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                {sharedEvents.createUnsynced} — {sharedEvents.linkLater}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  )
}
