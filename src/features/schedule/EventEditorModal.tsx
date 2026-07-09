import { useMemo, useState } from 'react'
import type { FlexibilityLevel, ScheduleEvent, ScheduleEventType, Training } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, Input, Select, TextArea } from '@/components/Input'
import { Toggle } from '@/components/Toggle'
import {
  buttons,
  eventTypeLabels,
  flexibilityLabels,
  generic,
  warnings
} from '@/lib/hebrewCopy'
import { eventTypeColors } from '@/lib/theme'
import { toMinutes, nowISO } from '@/lib/time'
import { newId } from '@/lib/ids'
import { newEventCopy } from './copy'
import { removeDraftEvent, upsertDraftEvent } from '@/data/services/scheduleService'
import { useCurrentUser } from '@/app/hooks'
import { daySpecFor } from './gridUtils'
import { dayOfWeek } from '@/lib/time'
import { clsx } from 'clsx'

const LOCKED_BY_TYPE: Partial<Record<ScheduleEventType, FlexibilityLevel>> = {
  SHARED: 'LOCKED_SHARED',
  PEAK_DAY: 'LOCKED_PEAK_DAY',
  GUEST_LECTURE: 'LOCKED_GUEST_LECTURE'
}

interface EventEditorModalProps {
  open: boolean
  onClose: () => void
  training: Training
  /** Existing event to edit, or null to create. */
  event: ScheduleEvent | null
  /** Prefill for creation. */
  defaultDate?: string
}

function timeOptions(date: string, training: Training): string[] {
  const spec = daySpecFor(dayOfWeek(date), training.settings)
  const options: string[] = []
  for (let m = spec.startMinutes; m <= spec.endMinutes; m += 15) {
    options.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return options
}

export function EventEditorModal(props: EventEditorModalProps) {
  // Remount the inner form whenever the modal opens or targets another event,
  // so state resets without effects.
  if (!props.open) return null
  return <EventEditorForm key={props.event?.id ?? 'new'} {...props} />
}

function EventEditorForm({ open, onClose, training, event, defaultDate }: EventEditorModalProps) {
  const user = useCurrentUser()
  const [form, setForm] = useState(() => initialForm(event, defaultDate, training))
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const options = useMemo(() => timeOptions(form.date, training), [form.date, training])
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function handleSave() {
    if (!user) return
    if (!form.title.trim()) {
      setError(newEventCopy.titleRequired)
      return
    }
    if (toMinutes(form.endTime) <= toMinutes(form.startTime)) {
      setError(newEventCopy.endAfterStart)
      return
    }
    const flexibility = LOCKED_BY_TYPE[form.type] ?? form.flexibilityLevel
    const locked = Boolean(LOCKED_BY_TYPE[form.type]) || form.isLocked
    const now = nowISO()
    const saved: ScheduleEvent = {
      id: event?.id ?? newId('evt'),
      trainingId: training.id,
      scheduleId: event?.scheduleId,
      title: form.title.trim(),
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      type: form.type,
      flexibilityLevel: flexibility,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      durationMinutes: toMinutes(form.endTime) - toMinutes(form.startTime),
      isFullDay: form.type === 'PEAK_DAY' ? true : event?.isFullDay,
      isLocked: locked,
      lockReason: locked ? form.lockReason.trim() || undefined : undefined,
      location: form.location.trim() || undefined,
      instructorName: form.instructorName.trim() || undefined,
      lecturerId: event?.lecturerId,
      equipment: form.equipment
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      commanderNotes: form.commanderNotes.trim() || undefined,
      soldierNotes: form.soldierNotes.trim() || undefined,
      visibleToSoldiers: form.visibleToSoldiers,
      showBasicDetailsOnly: form.showBasicDetailsOnly,
      color: form.color || undefined,
      sharedGroupId: event?.sharedGroupId,
      peakDayId: event?.peakDayId,
      createdBy: event?.createdBy ?? user.id,
      updatedBy: user.id,
      createdAt: event?.createdAt ?? now,
      updatedAt: now
    }
    await upsertDraftEvent(training.id, saved)
    onClose()
  }

  async function handleDelete() {
    if (!event) return
    await removeDraftEvent(training.id, event.id)
    onClose()
  }

  const palette = Object.values(eventTypeColors).slice(0, 8)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? newEventCopy.editTitle : buttons.addEvent}
      subtitle={warnings.draftOnlyUntilPublish}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => void handleSave()}>{buttons.save}</Button>
            <Button variant="ghost" onClick={onClose}>
              {buttons.cancel}
            </Button>
            {error ? <span className="text-sm text-danger">{error}</span> : null}
          </div>
          {event ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-danger">{newEventCopy.confirmDelete}</span>
                <Button variant="danger" size="sm" onClick={() => void handleDelete()}>
                  {buttons.delete}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  {buttons.cancel}
                </Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                {buttons.delete}
              </Button>
            )
          ) : null}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label={generic.title} required className="col-span-2">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />
        </Field>

        <Field label={generic.type}>
          <Select
            value={form.type}
            onChange={(e) => set('type', e.target.value as ScheduleEventType)}
          >
            {(Object.keys(eventTypeLabels) as ScheduleEventType[]).map((t) => (
              <option key={t} value={t}>
                {eventTypeLabels[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={generic.flexibility}
          hint={LOCKED_BY_TYPE[form.type] ? newEventCopy.flexibilityForcedByType : undefined}
        >
          <Select
            value={LOCKED_BY_TYPE[form.type] ?? form.flexibilityLevel}
            disabled={Boolean(LOCKED_BY_TYPE[form.type])}
            onChange={(e) => set('flexibilityLevel', e.target.value as FlexibilityLevel)}
          >
            {(Object.keys(flexibilityLabels) as FlexibilityLevel[]).map((f) => (
              <option key={f} value={f}>
                {flexibilityLabels[f]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={generic.date}>
          <Input
            type="date"
            value={form.date}
            min={training.startDate}
            max={training.endDate}
            onChange={(e) => set('date', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={generic.startTime}>
            <Select value={form.startTime} onChange={(e) => set('startTime', e.target.value)}>
              {options.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={generic.endTime}>
            <Select value={form.endTime} onChange={(e) => set('endTime', e.target.value)}>
              {options.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={generic.shortDescription} className="col-span-2">
          <Input
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
          />
        </Field>

        <Field label={generic.location}>
          <Input value={form.location} onChange={(e) => set('location', e.target.value)} />
        </Field>
        <Field label={generic.instructor}>
          <Input
            value={form.instructorName}
            onChange={(e) => set('instructorName', e.target.value)}
          />
        </Field>

        <Field label={generic.equipment} hint={newEventCopy.equipmentHint} className="col-span-2">
          <Input value={form.equipment} onChange={(e) => set('equipment', e.target.value)} />
        </Field>

        <Field label={generic.commanderNotes}>
          <TextArea
            value={form.commanderNotes}
            onChange={(e) => set('commanderNotes', e.target.value)}
          />
        </Field>
        <Field label={generic.soldierNotes}>
          <TextArea
            value={form.soldierNotes}
            onChange={(e) => set('soldierNotes', e.target.value)}
          />
        </Field>

        <div className="col-span-2 flex flex-wrap items-center gap-6 rounded-xl bg-neutral-block/60 px-4 py-3">
          <Toggle
            checked={form.visibleToSoldiers}
            onChange={(v) => set('visibleToSoldiers', v)}
            label={newEventCopy.visibleToSoldiers}
          />
          <Toggle
            checked={form.showBasicDetailsOnly}
            onChange={(v) => set('showBasicDetailsOnly', v)}
            label={newEventCopy.basicDetailsOnly}
          />
          <Toggle
            checked={Boolean(LOCKED_BY_TYPE[form.type]) || form.isLocked}
            disabled={Boolean(LOCKED_BY_TYPE[form.type])}
            onChange={(v) => set('isLocked', v)}
            label={newEventCopy.lockEvent}
          />
          {(form.isLocked || LOCKED_BY_TYPE[form.type]) && (
            <Input
              placeholder={newEventCopy.lockReasonPlaceholder}
              value={form.lockReason}
              onChange={(e) => set('lockReason', e.target.value)}
              className="max-w-xs"
            />
          )}
        </div>

        <Field label={generic.color} className="col-span-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set('color', '')}
              className={clsx(
                'focus-ring h-7 rounded-lg border border-line px-2 text-xs',
                !form.color ? 'bg-primary-soft text-primary-hover' : 'bg-panel-solid text-ink-muted'
              )}
            >
              {newEventCopy.defaultColor}
            </button>
            {palette.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => set('color', c)}
                className={clsx(
                  'focus-ring h-7 w-7 rounded-lg',
                  form.color === c && 'ring-2 ring-ink ring-offset-2'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

function initialForm(event: ScheduleEvent | null, defaultDate: string | undefined, training: Training) {
  return {
    title: event?.title ?? '',
    shortDescription: event?.shortDescription ?? '',
    description: event?.description ?? '',
    type: (event?.type ?? 'FLEXIBLE_CONTENT') as ScheduleEventType,
    flexibilityLevel: (event?.flexibilityLevel ?? 'FLEXIBLE') as FlexibilityLevel,
    date: event?.date ?? defaultDate ?? training.startDate,
    startTime: event?.startTime ?? '09:00',
    endTime: event?.endTime ?? '10:00',
    isLocked: event?.isLocked ?? false,
    lockReason: event?.lockReason ?? '',
    location: event?.location ?? '',
    instructorName: event?.instructorName ?? '',
    equipment: (event?.equipment ?? []).join(', '),
    commanderNotes: event?.commanderNotes ?? '',
    soldierNotes: event?.soldierNotes ?? '',
    visibleToSoldiers: event?.visibleToSoldiers ?? true,
    showBasicDetailsOnly: event?.showBasicDetailsOnly ?? false,
    color: event?.color ?? ''
  }
}
