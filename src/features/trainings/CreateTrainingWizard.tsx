import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PendingSoldier, ScheduleEvent, Training } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Field, Input, Select } from '@/components/Input'
import { Toggle } from '@/components/Toggle'
import { Icon } from '@/assets/icons/Icon'
import {
  aiPlaceholder,
  buttons,
  eventTypeLabels,
  generic,
  presets,
  settingsCopy,
  wizard
} from '@/lib/hebrewCopy'
import { useCurrentUser } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { useUi } from '@/app/uiStore'
import { defaultTrainingSettings } from '@/data/mock/settings'
import { createTraining } from '@/data/services/trainingService'
import { ensureDraft, replaceDraft, upsertDraftEvent } from '@/data/services/scheduleService'
import { generateSchedule } from '@/features/scheduling-engine'
import { newId } from '@/lib/ids'
import { nowISO, toMinutes } from '@/lib/time'
import { trainingsCopy } from './copy'
import { clsx } from 'clsx'

interface HardEventRow {
  key: string
  type: 'SHARED' | 'PEAK_DAY' | 'GUEST_LECTURE' | 'CUSTOM'
  title: string
  date: string
  startTime: string
  endTime: string
  isFullDay: boolean
}

const HARD_TYPES: HardEventRow['type'][] = ['SHARED', 'PEAK_DAY', 'GUEST_LECTURE', 'CUSTOM']

export function CreateTrainingWizard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { users, presets: coursePresets } = useDb()
  const setSelectedTraining = useUi((s) => s.setSelectedTraining)

  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — details
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [cycle, setCycle] = useState('')
  const [courseType, setCourseType] = useState('')
  const [base, setBase] = useState('בה״ד 15')
  const [unit, setUnit] = useState('מערך ההדרכה')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Step 2 — people
  const commanders = users.filter((u) => u.role === 'TRAINING_COMMANDER')
  const seniors = users.filter((u) => u.role === 'SENIOR_COMMANDER')
  const soldiers = users.filter((u) => u.role === 'SOLDIER')
  const [commanderId, setCommanderId] = useState(
    user?.role === 'TRAINING_COMMANDER' ? user.id : commanders[0]?.id ?? ''
  )
  const [seniorId, setSeniorId] = useState(user?.role === 'SENIOR_COMMANDER' ? user.id : seniors[0]?.id ?? '')
  const [soldierIds, setSoldierIds] = useState<string[]>([])
  const [pendingSoldiers, setPendingSoldiers] = useState<PendingSoldier[]>([])
  const [pendingNumber, setPendingNumber] = useState('')
  const [pendingName, setPendingName] = useState('')

  // Step 3 — hours
  const [settings, setSettings] = useState(defaultTrainingSettings())

  // Step 5 — hard events
  const [hardRows, setHardRows] = useState<HardEventRow[]>([])

  // Step 6 — result
  const [createdTraining, setCreatedTraining] = useState<Training | null>(null)
  const [genSummary, setGenSummary] = useState<string | null>(null)

  function validateStep(): boolean {
    setError(null)
    if (step === 0) {
      if (!name.trim() || !symbol.trim() || !cycle.trim() || !startDate || !endDate) {
        setError(trainingsCopy.requiredFields)
        return false
      }
      if (endDate < startDate) {
        setError(trainingsCopy.endBeforeStart)
        return false
      }
    }
    if (step === 1 && !commanderId) {
      setError(trainingsCopy.requiredFields)
      return false
    }
    return true
  }

  async function createNow(generate: boolean) {
    if (!user) return
    const training = await createTraining({
      name: name.trim(),
      symbol: symbol.trim(),
      cycleNumber: cycle.trim(),
      courseType: courseType.trim() || undefined,
      base: base.trim() || 'בה״ד 15',
      unit: unit.trim(),
      startDate,
      endDate,
      commanderId,
      seniorCommanderId: seniorId || undefined,
      soldierIds,
      pendingSoldiers,
      settings
    })

    // Insert pre-known hard components into the fresh draft.
    const now = nowISO()
    for (const row of hardRows) {
      if (!row.title.trim() || !row.date) continue
      const start = row.isFullDay ? settings.defaultDayStart : row.startTime
      const end = row.isFullDay ? settings.defaultDayEnd : row.endTime
      const event: ScheduleEvent = {
        id: newId('evt'),
        trainingId: training.id,
        title: row.title.trim(),
        type: row.type,
        flexibilityLevel:
          row.type === 'SHARED'
            ? 'LOCKED_SHARED'
            : row.type === 'PEAK_DAY'
              ? 'LOCKED_PEAK_DAY'
              : row.type === 'GUEST_LECTURE'
                ? 'LOCKED_GUEST_LECTURE'
                : 'SEMI_FLEXIBLE',
        date: row.date,
        startTime: start,
        endTime: end,
        durationMinutes: toMinutes(end) - toMinutes(start),
        isFullDay: row.type === 'PEAK_DAY' ? true : row.isFullDay,
        isLocked: true,
        lockReason: 'הוגדר באשף יצירת ההכשרה',
        visibleToSoldiers: true,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now
      }
      await upsertDraftEvent(training.id, event)
    }

    if (generate) {
      const draft = await ensureDraft(training.id)
      const events = draft.events
      const output = generateSchedule({
        training,
        importedTrainingTemplate: null,
        existingDraftEvents: events,
        hardEvents: events.filter((e) => e.isLocked && e.type === 'CUSTOM'),
        knownGuestLectures: events.filter((e) => e.type === 'GUEST_LECTURE'),
        sharedEvents: events.filter((e) => e.type === 'SHARED'),
        peakDays: events.filter((e) => e.type === 'PEAK_DAY'),
        manualFlexibleEvents: [],
        settings
      })
      await replaceDraft(training.id, {
        ...output.schedule,
        id: draft.id,
        versionNumber: draft.versionNumber,
        events: output.schedule.events.map((e) => ({ ...e, scheduleId: draft.id }))
      })
      setGenSummary(
        trainingsCopy.generated(
          output.schedule.events.length,
          output.conflicts.length,
          output.impossibleItems.length
        )
      )
    }

    setCreatedTraining(training)
    setStep(6)
  }

  const stepLabels = wizard.steps

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={buttons.createTraining} />

      {/* Progress */}
      <ol className="mb-6 flex flex-wrap items-center gap-1.5">
        {stepLabels.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                i === step
                  ? 'bg-primary text-white'
                  : i < step
                    ? 'bg-success-soft text-success'
                    : 'bg-neutral-block text-ink-muted'
              )}
            >
              <span className="tnum">{i + 1}</span>
              {label}
            </span>
            {i < stepLabels.length - 1 ? <Icon name="chevron-left" size={12} className="text-ink-muted/50" /> : null}
          </li>
        ))}
      </ol>

      <div className="glass p-6">
        {step === 0 ? (
          <div className="grid grid-cols-2 gap-4">
            <Field label={trainingsCopy.presetLabel} className="col-span-2">
              <div className="flex flex-wrap gap-2">
                <Badge tone="primary">{trainingsCopy.noPreset}</Badge>
                {coursePresets.map((p) => (
                  <span key={p.id} title={presets.commandCourseBody}>
                    <Badge tone="neutral">
                      {p.name} — {trainingsCopy.presetDisabled}
                    </Badge>
                  </span>
                ))}
              </div>
            </Field>
            <Field label={wizard.fields.name} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <Field label={wizard.fields.symbol} required>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </Field>
            <Field label={wizard.fields.cycle} required>
              <Input value={cycle} onChange={(e) => setCycle(e.target.value)} />
            </Field>
            <Field label="סוג קורס">
              <Input value={courseType} onChange={(e) => setCourseType(e.target.value)} />
            </Field>
            <Field label={wizard.fields.startDate} required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label={wizard.fields.endDate} required>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
            <Field label={wizard.fields.base}>
              <Input value={base} onChange={(e) => setBase(e.target.value)} />
            </Field>
            <Field label={wizard.fields.unit}>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={wizard.fields.commander} required>
                <Select value={commanderId} onChange={(e) => setCommanderId(e.target.value)}>
                  {commanders.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={wizard.fields.seniorCommander}>
                <Select value={seniorId} onChange={(e) => setSeniorId(e.target.value)}>
                  <option value="">{generic.optional}</option>
                  {seniors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">{trainingsCopy.existingSoldiers}</h3>
              <div className="space-y-1.5">
                {soldiers.map((s) => {
                  const checked = soldierIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setSoldierIds((ids) => (checked ? ids.filter((i) => i !== s.id) : [...ids, s.id]))
                      }
                      className={clsx(
                        'focus-ring flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm',
                        checked ? 'border-primary bg-primary-soft' : 'border-line bg-panel-solid'
                      )}
                    >
                      <span className="font-medium text-ink">{s.displayName}</span>
                      <input type="checkbox" readOnly checked={checked} className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-1 text-sm font-semibold text-ink">{wizard.addPendingSoldier}</h3>
              <p className="mb-2 text-xs text-ink-muted">{wizard.pendingSoldierNote}</p>
              <div className="flex items-end gap-2">
                <Field label={generic.personalNumber}>
                  <Input value={pendingNumber} onChange={(e) => setPendingNumber(e.target.value)} dir="ltr" />
                </Field>
                <Field label={generic.name}>
                  <Input value={pendingName} onChange={(e) => setPendingName(e.target.value)} />
                </Field>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!pendingNumber.trim() || !pendingName.trim()) return
                    setPendingSoldiers((list) => [
                      ...list,
                      { personalNumber: pendingNumber.trim(), firstName: pendingName.trim() }
                    ])
                    setPendingNumber('')
                    setPendingName('')
                  }}
                >
                  {buttons.addSoldier}
                </Button>
              </div>
              {pendingSoldiers.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pendingSoldiers.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className="focus-ring tnum rounded-full bg-neutral-block px-3 py-1 text-xs text-ink hover:bg-danger-soft"
                      onClick={() => setPendingSoldiers((list) => list.filter((_, j) => j !== i))}
                      title={trainingsCopy.removeRow}
                    >
                      {p.firstName} ({p.personalNumber})
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={`${settingsCopy.sundayToThursday} — ${generic.startTime}`}>
                <Input
                  type="time"
                  step={900}
                  value={settings.defaultDayStart}
                  onChange={(e) => setSettings({ ...settings, defaultDayStart: e.target.value })}
                />
              </Field>
              <Field label={`${settingsCopy.sundayToThursday} — ${generic.endTime}`}>
                <Input
                  type="time"
                  step={900}
                  value={settings.defaultDayEnd}
                  onChange={(e) => setSettings({ ...settings, defaultDayEnd: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-end gap-4 rounded-xl bg-neutral-block/60 px-4 py-3">
              <Toggle
                checked={settings.fridayEnabled}
                onChange={(v) => setSettings({ ...settings, fridayEnabled: v })}
                label={settingsCopy.friday}
              />
              {settings.fridayEnabled ? (
                <>
                  <Input
                    type="time"
                    step={900}
                    value={settings.fridayStart}
                    onChange={(e) => setSettings({ ...settings, fridayStart: e.target.value })}
                    className="w-28"
                  />
                  <Input
                    type="time"
                    step={900}
                    value={settings.fridayEnd}
                    onChange={(e) => setSettings({ ...settings, fridayEnd: e.target.value })}
                    className="w-28"
                  />
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-4 rounded-xl bg-neutral-block/60 px-4 py-3">
              <Toggle
                checked={settings.saturdayEnabled}
                onChange={(v) => setSettings({ ...settings, saturdayEnabled: v })}
                label={settingsCopy.saturday}
              />
              {settings.saturdayEnabled ? (
                <>
                  <Input
                    type="time"
                    step={900}
                    value={settings.saturdayStart}
                    onChange={(e) => setSettings({ ...settings, saturdayStart: e.target.value })}
                    className="w-28"
                  />
                  <Input
                    type="time"
                    step={900}
                    value={settings.saturdayEnd}
                    onChange={(e) => setSettings({ ...settings, saturdayEnd: e.target.value })}
                    className="w-28"
                  />
                </>
              ) : null}
              <span className="text-xs text-ink-muted">{settingsCopy.saturdayNote}</span>
            </div>
            <div className="flex flex-wrap gap-6 rounded-xl bg-neutral-block/60 px-4 py-3">
              <Toggle
                checked={settings.allowMonthView}
                onChange={(v) => setSettings({ ...settings, allowMonthView: v })}
                label={settingsCopy.allowMonthView}
              />
              <Toggle
                checked={settings.allowSoldiersToSeeNextWeek}
                onChange={(v) => setSettings({ ...settings, allowSoldiersToSeeNextWeek: v })}
                label={settingsCopy.allowSoldiersNextWeek}
              />
            </div>
            <p className="text-xs text-ink-muted">
              {settingsCopy.lunchWindow}: {settings.lunchWindow.earliestStart}-{settings.lunchWindow.latestStart} |{' '}
              {settingsCopy.dinnerWindow}: {settings.dinnerWindow.earliestStart}-{settings.dinnerWindow.latestStart}.{' '}
              {settingsCopy.mealNote}
            </p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <p className="text-sm text-ink">{trainingsCopy.importLaterNote}</p>
            <div className="rounded-xl border border-dashed border-line bg-panel-solid/60 px-4 py-4 text-sm text-ink-muted">
              <div className="mb-1 flex items-center gap-2 font-medium text-ink">
                <Icon name="lock" size={15} />
                {aiPlaceholder.title}
              </div>
              <p className="whitespace-pre-line text-xs">{aiPlaceholder.body}</p>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">{trainingsCopy.hardEventsTitle}</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setHardRows((rows) => [
                    ...rows,
                    {
                      key: newId('row'),
                      type: 'SHARED',
                      title: '',
                      date: startDate,
                      startTime: '10:00',
                      endTime: '11:00',
                      isFullDay: false
                    }
                  ])
                }
              >
                <Icon name="plus" size={14} />
                {trainingsCopy.addHardEvent}
              </Button>
            </div>
            {hardRows.map((row) => (
              <div key={row.key} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-line bg-panel-solid px-3 py-2">
                <Field label={trainingsCopy.hardEventTypeLabel} className="col-span-2">
                  <Select
                    value={row.type}
                    onChange={(e) =>
                      setHardRows((rows) =>
                        rows.map((r) => (r.key === row.key ? { ...r, type: e.target.value as HardEventRow['type'] } : r))
                      )
                    }
                  >
                    {HARD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {eventTypeLabels[t]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={generic.title} className="col-span-4">
                  <Input
                    value={row.title}
                    onChange={(e) =>
                      setHardRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, title: e.target.value } : r)))
                    }
                  />
                </Field>
                <Field label={generic.date} className="col-span-2">
                  <Input
                    type="date"
                    value={row.date}
                    min={startDate}
                    max={endDate}
                    onChange={(e) =>
                      setHardRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, date: e.target.value } : r)))
                    }
                  />
                </Field>
                {row.type !== 'PEAK_DAY' ? (
                  <>
                    <Field label={generic.startTime} className="col-span-1">
                      <Input
                        type="time"
                        step={900}
                        value={row.startTime}
                        onChange={(e) =>
                          setHardRows((rows) =>
                            rows.map((r) => (r.key === row.key ? { ...r, startTime: e.target.value } : r))
                          )
                        }
                      />
                    </Field>
                    <Field label={generic.endTime} className="col-span-1">
                      <Input
                        type="time"
                        step={900}
                        value={row.endTime}
                        onChange={(e) =>
                          setHardRows((rows) =>
                            rows.map((r) => (r.key === row.key ? { ...r, endTime: e.target.value } : r))
                          )
                        }
                      />
                    </Field>
                  </>
                ) : (
                  <span className="col-span-2 pb-2 text-xs text-ink-muted">יום מלא</span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-2"
                  onClick={() => setHardRows((rows) => rows.filter((r) => r.key !== row.key))}
                >
                  <Icon name="trash" size={14} />
                  {trainingsCopy.removeRow}
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">{trainingsCopy.summaryTitle}</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <SummaryRow label={wizard.fields.name} value={`${name} (${symbol})`} />
              <SummaryRow label={wizard.fields.cycle} value={cycle} />
              <SummaryRow label={wizard.fields.startDate} value={startDate} />
              <SummaryRow label={wizard.fields.endDate} value={endDate} />
              <SummaryRow
                label={wizard.fields.commander}
                value={commanders.find((c) => c.id === commanderId)?.displayName ?? ''}
              />
              <SummaryRow
                label={wizard.fields.soldiers}
                value={trainingsCopy.soldiers(soldierIds.length, pendingSoldiers.length)}
              />
              <SummaryRow label={trainingsCopy.hardEventsTitle} value={String(hardRows.length)} />
            </dl>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-3 py-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
              <Icon name="success" size={24} />
            </span>
            <p className="text-base font-medium text-ink">{trainingsCopy.created}</p>
            {genSummary ? <p className="tnum text-sm text-ink-muted">{genSummary}</p> : null}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                onClick={() => {
                  if (createdTraining) setSelectedTraining(createdTraining.id)
                  navigate('/schedule')
                }}
              >
                {trainingsCopy.goToBuilder}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/trainings')}>
                {trainingsCopy.backToList}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Footer nav */}
        {step < 6 ? (
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                  {buttons.previous}
                </Button>
              ) : null}
              {error ? <span className="text-sm text-danger">{error}</span> : null}
            </div>
            <div className="flex items-center gap-2">
              {step < 5 ? (
                <Button
                  onClick={() => {
                    if (validateStep()) setStep((s) => s + 1)
                  }}
                >
                  {buttons.next}
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => void createNow(false)}>
                    {trainingsCopy.createWithoutGenerate}
                  </Button>
                  <Button onClick={() => void createNow(true)}>{trainingsCopy.createAndGenerate}</Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
