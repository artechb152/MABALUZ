import { useMemo, useState } from 'react'
import type { GuestLecturer, Training } from '@/types'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/Button'
import { Field, Input, Select } from '@/components/Input'
import { buttons, generic, lecturers as lecturersCopy } from '@/lib/hebrewCopy'
import { useCurrentUser } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { addGuestLecture } from '@/data/services/lecturerService'
import { LecturerFormModal } from './LecturerFormModal'
import { lectCopy } from './copy'
import { clsx } from 'clsx'

interface AddLectureModalProps {
  training: Training
  onClose: () => void
}

const WARN_OPTIONS = [
  { label: lecturersCopy.warnBeforeOptions[0], minutes: 60 },
  { label: lecturersCopy.warnBeforeOptions[1], minutes: 120 },
  { label: lecturersCopy.warnBeforeOptions[2], minutes: 180 },
  { label: lecturersCopy.warnBeforeOptions[3], minutes: -1 }
]

export function AddLectureModal({ training, onClose }: AddLectureModalProps) {
  const user = useCurrentUser()
  const allLecturers = useDb((s) => s.lecturers)

  const [search, setSearch] = useState('')
  const [lecturerId, setLecturerId] = useState<string | null>(null)
  const [newLecturerOpen, setNewLecturerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('14:30')
  const [location, setLocation] = useState(training.settings.baseLocation)
  const [maxDuration, setMaxDuration] = useState(90)
  const [warnChoice, setWarnChoice] = useState(120)
  const [customWarn, setCustomWarn] = useState(120)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const results = useMemo(() => {
    const q = search.trim()
    if (!q) return allLecturers
    return allLecturers.filter(
      (l) => l.fullName.includes(q) || l.role.includes(q) || l.lectureTypes.some((t) => t.includes(q))
    )
  }, [allLecturers, search])

  const selected = allLecturers.find((l) => l.id === lecturerId) ?? null

  function pickLecturer(l: GuestLecturer) {
    setLecturerId(l.id)
    if (!title.trim()) setTitle(`הרצאת חוץ: ${l.lectureTypes[0] ?? ''}`.trim())
  }

  async function save() {
    if (!user) return
    if (!lecturerId || !title.trim() || !date) {
      setError(generic.required)
      return
    }
    await addGuestLecture({
      trainingId: training.id,
      lecturerId,
      title: title.trim(),
      date,
      startTime,
      endTime,
      location: location.trim() || undefined,
      maxDurationMinutes: maxDuration,
      noConfirmationWarnMinutesBefore: warnChoice === -1 ? customWarn : warnChoice,
      createdBy: user.id
    })
    setDone(true)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={lectCopy.addLectureTitle}
        size="lg"
        footer={
          done ? (
            <Button onClick={onClose}>{buttons.close}</Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={() => void save()}>{buttons.save}</Button>
              <Button variant="ghost" onClick={onClose}>
                {buttons.cancel}
              </Button>
              {error ? <span className="text-sm text-danger">{error}</span> : null}
            </div>
          )
        }
      >
        {done ? (
          <p className="py-6 text-center text-sm text-success">{lectCopy.lectureAdded}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">{lectCopy.pickLecturer}</h3>
                <Button variant="ghost" size="sm" onClick={() => setNewLecturerOpen(true)}>
                  {lecturersCopy.addNewLecturer}
                </Button>
              </div>
              <Input
                placeholder={lecturersCopy.searchLecturer}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-36 space-y-1.5 overflow-y-auto">
                {results.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => pickLecturer(l)}
                    className={clsx(
                      'focus-ring flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors',
                      lecturerId === l.id
                        ? 'border-primary bg-primary-soft'
                        : 'border-line bg-panel-solid hover:border-primary/40'
                    )}
                  >
                    <span className="font-medium text-ink">
                      {l.fullName} — {l.role}
                    </span>
                    <span className="text-xs text-ink-muted">{l.lectureTypes.join(', ')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={lectCopy.lectureTitleLabel} required className="col-span-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <Field label={generic.location}>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </Field>
              <Field label={generic.startTime}>
                <Input type="time" step={900} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </Field>
              <Field label={generic.endTime}>
                <Input type="time" step={900} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
              <Field label={lecturersCopy.maxDuration}>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value) || 90)}
                />
              </Field>
              <Field label={lectCopy.warnBeforeLabel}>
                <div className="flex items-center gap-2">
                  <Select value={warnChoice} onChange={(e) => setWarnChoice(Number(e.target.value))}>
                    {WARN_OPTIONS.map((o) => (
                      <option key={o.minutes} value={o.minutes}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  {warnChoice === -1 ? (
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      value={customWarn}
                      onChange={(e) => setCustomWarn(Number(e.target.value) || 60)}
                      aria-label={lectCopy.customMinutes}
                      className="w-24"
                    />
                  ) : null}
                </div>
              </Field>
            </div>

            {selected ? (
              <p className="text-xs text-ink-muted">
                {selected.fullName} | {selected.phone} | {selected.email}
              </p>
            ) : null}
          </div>
        )}
      </Modal>

      {newLecturerOpen ? (
        <LecturerFormModal
          lecturer={null}
          onClose={() => setNewLecturerOpen(false)}
          onSaved={(l) => pickLecturer(l)}
        />
      ) : null}
    </>
  )
}
