import { useState } from 'react'
import type { SharedEventGroup } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, Input, TextArea } from '@/components/Input'
import { buttons, generic, warnings } from '@/lib/hebrewCopy'
import { useCurrentUser, useSelectedTraining } from '@/app/hooks'
import { requestSharedChange } from '@/data/services/sharedEventService'
import { sharedCopy } from './copy'

interface RequestChangeModalProps {
  group: SharedEventGroup
  onClose: () => void
}

export function RequestChangeModal({ group, onClose }: RequestChangeModalProps) {
  const user = useCurrentUser()
  const training = useSelectedTraining()
  const [description, setDescription] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!user || !training) return
    if (!description.trim()) {
      setError(sharedCopy.changeDescription + ' — ' + generic.required)
      return
    }
    await requestSharedChange({
      groupId: group.id,
      requestedByUserId: user.id,
      requestedByTrainingId: training.id,
      description: description.trim(),
      newDate: newDate || undefined,
      newStartTime: newStartTime || undefined,
      newEndTime: newEndTime || undefined
    })
    setDone(true)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${sharedCopy.changeTitle}: ${group.title}`}
      subtitle={warnings.sharedChangeBeforePublish}
      size="md"
      footer={
        done ? (
          <Button onClick={onClose}>{buttons.close}</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={() => void submit()}>{buttons.confirm}</Button>
            <Button variant="ghost" onClick={onClose}>
              {buttons.cancel}
            </Button>
            {error ? <span className="text-sm text-danger">{error}</span> : null}
          </div>
        )
      }
    >
      {done ? (
        <p className="py-6 text-center text-sm text-success">{sharedCopy.submitted}</p>
      ) : (
        <div className="space-y-3">
          <Field label={sharedCopy.changeDescription} required>
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={generic.date}>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </Field>
            <Field label={generic.startTime}>
              <Input type="time" step={900} value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
            </Field>
            <Field label={generic.endTime}>
              <Input type="time" step={900} value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  )
}
