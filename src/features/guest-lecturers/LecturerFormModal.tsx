import { useState } from 'react'
import type { GuestLecturer } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, Input, TextArea } from '@/components/Input'
import { buttons, generic } from '@/lib/hebrewCopy'
import { createLecturer, updateLecturer } from '@/data/services/lecturerService'
import { lectCopy } from './copy'

interface LecturerFormModalProps {
  lecturer: GuestLecturer | null
  onClose: () => void
  onSaved?: (lecturer: GuestLecturer) => void
}

export function LecturerFormModal({ lecturer, onClose, onSaved }: LecturerFormModalProps) {
  const [fullName, setFullName] = useState(lecturer?.fullName ?? '')
  const [role, setRole] = useState(lecturer?.role ?? '')
  const [organization, setOrganization] = useState(lecturer?.organization ?? '')
  const [email, setEmail] = useState(lecturer?.email ?? '')
  const [phone, setPhone] = useState(lecturer?.phone ?? '')
  const [types, setTypes] = useState((lecturer?.lectureTypes ?? []).join(', '))
  const [notes, setNotes] = useState(lecturer?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!fullName.trim() || !role.trim() || !email.trim() || !phone.trim() || !types.trim()) {
      setError(generic.required)
      return
    }
    const data = {
      fullName: fullName.trim(),
      role: role.trim(),
      organization: organization.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      lectureTypes: types
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: notes.trim() || undefined
    }
    const saved = lecturer
      ? await updateLecturer(lecturer.id, data)
      : await createLecturer(data)
    if (saved) onSaved?.(saved)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={lecturer ? lectCopy.editLecturer : lectCopy.addLecturer}
      size="lg"
      footer={
        <div className="flex items-center gap-2">
          <Button onClick={() => void save()}>{buttons.save}</Button>
          <Button variant="ghost" onClick={onClose}>
            {buttons.cancel}
          </Button>
          {error ? <span className="text-sm text-danger">{error}</span> : null}
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label={generic.name} required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </Field>
        <Field label={generic.role} required>
          <Input value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label={generic.organization}>
          <Input value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </Field>
        <Field label={generic.phone} required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        </Field>
        <Field label={generic.email} required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </Field>
        <Field label="נושאי הרצאה" required hint={lectCopy.typesHint}>
          <Input value={types} onChange={(e) => setTypes(e.target.value)} />
        </Field>
        <Field label={generic.notes} className="col-span-2">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
