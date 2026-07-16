import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Training, TrainingSettings } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Field, Input } from '@/components/Input'
import { Toggle } from '@/components/Toggle'
import { Icon } from '@/assets/icons/Icon'
import { buttons, emptyStates, generic, nav, settingsCopy } from '@/lib/hebrewCopy'
import { useCurrentUser, useSelectedTraining } from '@/app/hooks'
import { updateTraining } from '@/data/services/trainingService'

export function SettingsPage() {
  const training = useSelectedTraining()

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.settings} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }
  // key resets the form state when switching trainings.
  return <SettingsForm key={training.id} training={training} />
}

function SettingsForm({ training }: { training: Training }) {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [form, setForm] = useState<TrainingSettings>(training.settings)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof TrainingSettings>(key: K, value: TrainingSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function save() {
    await updateTraining(training.id, { settings: form })
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={nav.settings}
        subtitle={training.name}
        actions={
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <Icon name="success" size={15} />
                {buttons.save}
              </span>
            ) : null}
            <Button onClick={() => void save()}>{buttons.save}</Button>
          </div>
        }
      />

      <div className="space-y-4">
        <section className="glass-solid p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">{settingsCopy.trainingHours}</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`${settingsCopy.sundayToThursday} — ${generic.startTime}`}>
                <Input type="time" step={900} value={form.defaultDayStart} onChange={(e) => set('defaultDayStart', e.target.value)} />
              </Field>
              <Field label={`${settingsCopy.sundayToThursday} — ${generic.endTime}`}>
                <Input type="time" step={900} value={form.defaultDayEnd} onChange={(e) => set('defaultDayEnd', e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-neutral-block/60 px-4 py-3">
              <Toggle checked={form.fridayEnabled} onChange={(v) => set('fridayEnabled', v)} label={settingsCopy.friday} />
              {form.fridayEnabled ? (
                <>
                  <Input type="time" step={900} value={form.fridayStart} onChange={(e) => set('fridayStart', e.target.value)} className="w-28" />
                  <Input type="time" step={900} value={form.fridayEnd} onChange={(e) => set('fridayEnd', e.target.value)} className="w-28" />
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-neutral-block/60 px-4 py-3">
              <Toggle checked={form.saturdayEnabled} onChange={(v) => set('saturdayEnabled', v)} label={settingsCopy.saturday} />
              {form.saturdayEnabled ? (
                <>
                  <Input type="time" step={900} value={form.saturdayStart} onChange={(e) => set('saturdayStart', e.target.value)} className="w-28" />
                  <Input type="time" step={900} value={form.saturdayEnd} onChange={(e) => set('saturdayEnd', e.target.value)} className="w-28" />
                </>
              ) : null}
              <span className="text-xs text-ink-muted">{settingsCopy.saturdayNote}</span>
            </div>
          </div>
        </section>

        <section className="glass-solid p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            {settingsCopy.lunchWindow} / {settingsCopy.dinnerWindow}
          </h2>
          <p className="tnum text-sm text-ink-muted">
            {settingsCopy.lunchWindow}: {form.lunchWindow.earliestStart}-{form.lunchWindow.latestStart} ({form.lunchWindow.durationMinutes} {generic.minutes})
          </p>
          <p className="tnum text-sm text-ink-muted">
            {settingsCopy.dinnerWindow}: {form.dinnerWindow.earliestStart}-{form.dinnerWindow.latestStart}, סיום עד {form.dinnerWindow.latestEnd}
          </p>
          <p className="mt-2 text-xs text-ink-muted">{settingsCopy.mealNote}</p>
        </section>

        <section className="glass-solid space-y-3 p-5">
          <Toggle checked={form.allowMonthView} onChange={(v) => set('allowMonthView', v)} label={settingsCopy.allowMonthView} />
          <Toggle
            checked={form.allowSoldiersToSeeNextWeek}
            onChange={(v) => set('allowSoldiersToSeeNextWeek', v)}
            label={settingsCopy.allowSoldiersNextWeek}
          />
          <Toggle
            checked={form.approvalRequiredForTrainingCommanderEdits}
            onChange={(v) => set('approvalRequiredForTrainingCommanderEdits', v)}
            label="נדרש אישור מפקד בכיר לשינויי לו״ז"
          />
          <Field label="מיקום בסיס">
            <Input value={form.baseLocation} onChange={(e) => set('baseLocation', e.target.value)} className="max-w-xs" />
          </Field>
        </section>

        {user?.role === 'ADMIN' ? (
          <Button variant="secondary" onClick={() => navigate('/admin')}>
            <Icon name="admin" size={15} />
            {nav.adminArea}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
