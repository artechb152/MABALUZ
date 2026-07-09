import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScheduleConflict, ScheduleEvent, Training } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { buttons, generic, lecturers as lecturersCopy } from '@/lib/hebrewCopy'
import { cancelOrRescheduleLecture } from '@/data/services/lecturerService'
import { lectCopy } from './copy'

interface CancelLectureFlowProps {
  training: Training
  event: ScheduleEvent
  onClose: () => void
}

type Step = 'question' | 'newTime' | 'rescheduled' | 'cancelled'

/** Guided "המרצה ביטל" flow per spec: new time -> conflict-checked reschedule; no time -> cancel. */
export function CancelLectureFlow({ training, event, onClose }: CancelLectureFlowProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('question')
  const [newDate, setNewDate] = useState('')
  const [newStart, setNewStart] = useState(event.startTime)
  const [newEnd, setNewEnd] = useState(event.endTime)
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [error, setError] = useState<string | null>(null)

  async function reschedule() {
    if (!newDate) {
      setError(generic.required)
      return
    }
    const result = await cancelOrRescheduleLecture({
      trainingId: training.id,
      eventId: event.id,
      newDate,
      newStartTime: newStart,
      newEndTime: newEnd
    })
    if (!result.ok) {
      setConflicts(result.conflicts)
      return
    }
    setConflicts([])
    setStep('rescheduled')
  }

  async function cancelCompletely() {
    await cancelOrRescheduleLecture({ trainingId: training.id, eventId: event.id })
    setStep('cancelled')
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${lectCopy.cancelFlowTitle}: ${event.title}`}
      size="md"
      footer={
        step === 'rescheduled' || step === 'cancelled' ? (
          <div className="flex items-center gap-2">
            <Button onClick={onClose}>{buttons.close}</Button>
            <Button variant="secondary" onClick={() => navigate('/schedule')}>
              {lectCopy.checkSchedule}
            </Button>
          </div>
        ) : step === 'newTime' ? (
          <div className="flex items-center gap-2">
            <Button onClick={() => void reschedule()}>{buttons.confirm}</Button>
            <Button variant="ghost" onClick={() => setStep('question')}>
              {buttons.previous}
            </Button>
            {error ? <span className="text-sm text-danger">{error}</span> : null}
          </div>
        ) : null
      }
    >
      {step === 'question' ? (
        <div className="space-y-4 py-2">
          <p className="text-center text-base font-medium text-ink">{lecturersCopy.cancelledQuestion}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" onClick={() => setStep('newTime')}>
              {lecturersCopy.cancelledYes}
            </Button>
            <Button variant="danger" size="lg" onClick={() => void cancelCompletely()}>
              {lecturersCopy.cancelledNo}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'newTime' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label={generic.date} required>
              <Input
                type="date"
                value={newDate}
                min={training.startDate}
                max={training.endDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </Field>
            <Field label={generic.startTime}>
              <Input type="time" step={900} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </Field>
            <Field label={generic.endTime}>
              <Input type="time" step={900} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </Field>
          </div>
          {conflicts.length > 0 ? (
            <div className="space-y-2 rounded-xl bg-danger-soft px-4 py-3">
              <p className="text-sm font-semibold text-danger">{lectCopy.conflictsFound}</p>
              <ul className="space-y-1">
                {conflicts.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-sm text-danger">
                    <Badge tone="danger">{c.title}</Badge>
                    <span>{c.description}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-danger">{lectCopy.pickAnother}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'rescheduled' ? (
        <p className="py-6 text-center text-sm text-success">{lectCopy.newTimeSaved}</p>
      ) : null}
      {step === 'cancelled' ? (
        <p className="py-6 text-center text-sm text-ink">{lectCopy.cancelledNote}</p>
      ) : null}
    </Modal>
  )
}
