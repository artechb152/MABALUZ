import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScheduleEvent, Training } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, Input, Select, TextArea } from '@/components/Input'
import { Toggle } from '@/components/Toggle'
import { buttons, generic, peakDays, warnings } from '@/lib/hebrewCopy'
import { useCurrentUser, useDraftSchedule } from '@/app/hooks'
import { upsertDraftEvent } from '@/data/services/scheduleService'
import { detectConflicts } from '@/features/scheduling-engine'
import { useDb } from '@/app/dbStore'
import { newId } from '@/lib/ids'
import { nowISO } from '@/lib/time'
import { peakCopy } from './copy'

interface PeakDayModalProps {
  training: Training
  event: ScheduleEvent | null
  onClose: () => void
}

export function PeakDayModal({ training, event, onClose }: PeakDayModalProps) {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const draft = useDraftSchedule(training)
  const lecturers = useDb((s) => s.lecturers)

  const [title, setTitle] = useState(event?.title ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [activityType, setActivityType] = useState(event?.shortDescription ?? peakDays.activityTypes[0])
  const [customType, setCustomType] = useState('')
  const [visible, setVisible] = useState(event?.visibleToSoldiers ?? true)
  const [basicOnly, setBasicOnly] = useState(event?.showBasicDetailsOnly ?? true)
  const [location, setLocation] = useState(event?.location ?? '')
  const [notes, setNotes] = useState(event?.commanderNotes ?? '')
  const [step, setStep] = useState<'form' | 'warning' | 'done'>('form')
  const [resultConflicts, setResultConflicts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const isOther = activityType === peakDays.otherTypeLabel

  const dayEvents = useMemo(
    () => (draft?.events ?? []).filter((e) => e.date === date && e.id !== event?.id),
    [draft, date, event]
  )
  const clashGuest = dayEvents.some((e) => e.type === 'GUEST_LECTURE')
  const clashShared = dayEvents.some((e) => e.type === 'SHARED')

  async function save() {
    if (!user || !draft) return
    if (!title.trim() || !date) {
      setError(generic.required)
      return
    }
    if (date < training.startDate || date > training.endDate) {
      setError(peakCopy.dateOutOfRange)
      return
    }
    if (step === 'form' && dayEvents.length > 0) {
      setStep('warning')
      return
    }
    const now = nowISO()
    const typeText = isOther ? customType.trim() || peakDays.otherTypeLabel : activityType
    const saved: ScheduleEvent = {
      id: event?.id ?? newId('evt'),
      trainingId: training.id,
      scheduleId: draft.id,
      title: title.trim(),
      shortDescription: typeText,
      type: 'PEAK_DAY',
      flexibilityLevel: 'LOCKED_PEAK_DAY',
      date,
      startTime: training.settings.defaultDayStart,
      endTime: training.settings.defaultDayEnd,
      durationMinutes: 12 * 60,
      isFullDay: true,
      isLocked: true,
      lockReason: 'יום שיא מתוכנן',
      location: location.trim() || undefined,
      commanderNotes: notes.trim() || undefined,
      visibleToSoldiers: visible,
      showBasicDetailsOnly: basicOnly,
      peakDayId: event?.peakDayId ?? newId('peak'),
      createdBy: event?.createdBy ?? user.id,
      updatedBy: user.id,
      createdAt: event?.createdAt ?? now,
      updatedAt: now
    }
    const updated = await upsertDraftEvent(training.id, saved)
    const conflicts = detectConflicts({
      events: updated.events,
      training,
      settings: training.settings,
      lecturers,
      lockedDates: updated.lockedDates
    })
    setResultConflicts(conflicts.length)
    setStep('done')
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={event ? `${buttons.edit}: ${event.title}` : buttons.addPeakDay}
      subtitle={peakDays.fullDayNote}
      size="lg"
      footer={
        step === 'done' ? (
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>{buttons.close}</Button>
            {resultConflicts > 0 ? (
              <Button variant="secondary" onClick={() => navigate('/conflicts')}>
                {peakCopy.goConflicts}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={() => void save()}>
              {step === 'warning' ? buttons.continueAnyway : buttons.save}
            </Button>
            {step === 'warning' ? (
              <Button variant="ghost" onClick={() => setStep('form')}>
                {buttons.previous}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose}>
              {buttons.cancel}
            </Button>
            {error ? <span className="text-sm text-danger">{error}</span> : null}
          </div>
        )
      }
    >
      {step === 'done' ? (
        <p className="py-6 text-center text-sm text-ink">
          {resultConflicts > 0 ? peakCopy.savedWithConflicts(resultConflicts) : peakCopy.saved}
        </p>
      ) : step === 'warning' ? (
        <div className="space-y-3">
          {clashGuest ? (
            <div className="whitespace-pre-line rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {warnings.peakDayOverridesGuestLecture}
            </div>
          ) : null}
          {clashShared ? (
            <div className="whitespace-pre-line rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {warnings.peakDayOverridesShared}
            </div>
          ) : null}
          {!clashGuest && !clashShared ? (
            <div className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
              {warnings.willMoveExistingEvents}
            </div>
          ) : null}
          <h3 className="text-sm font-semibold text-ink">{peakCopy.overlapListTitle}</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-muted">
            {dayEvents.map((e) => (
              <li key={e.id}>
                {e.title} <span className="tnum">({e.startTime}-{e.endTime})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Field label={generic.title} required className="col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <Field label={generic.date} required>
            <Input
              type="date"
              value={date}
              min={training.startDate}
              max={training.endDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label={peakCopy.activityType}>
            <Select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
              {peakDays.activityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          {isOther ? (
            <Field label={peakDays.customTypePlaceholder} className="col-span-2">
              <Input value={customType} onChange={(e) => setCustomType(e.target.value)} />
            </Field>
          ) : null}
          <Field label={generic.location}>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label={peakCopy.notesLabel}>
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="col-span-2 flex flex-wrap items-center gap-6 rounded-xl bg-neutral-block/60 px-4 py-3">
            <Toggle checked={visible} onChange={setVisible} label={peakDays.showToSoldiers} />
            <Toggle checked={basicOnly} onChange={setBasicOnly} label={peakDays.hideDetails} />
          </div>
        </div>
      )}
    </Modal>
  )
}
