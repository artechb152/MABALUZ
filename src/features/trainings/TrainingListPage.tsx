import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { buttons, emptyStates, nav, presets, trainingStatusLabels } from '@/lib/hebrewCopy'
import { useMyTrainings } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { useUi } from '@/app/uiStore'
import { formatDateHe } from '@/lib/time'
import { trainingsCopy } from './copy'

export function TrainingListPage() {
  const navigate = useNavigate()
  const trainings = useMyTrainings()
  const { users, presets: coursePresets } = useDb()
  const setSelectedTraining = useUi((s) => s.setSelectedTraining)

  return (
    <div>
      <PageHeader
        title={nav.myTrainings}
        actions={
          <Button onClick={() => navigate('/trainings/new')}>{buttons.createTraining}</Button>
        }
      />

      {trainings.length === 0 ? (
        <EmptyState message={emptyStates.noTrainings} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {trainings.map((t) => {
            const commander = users.find((u) => u.id === t.commanderId)
            return (
              <div key={t.id} className="card-tex p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[22px] font-semibold text-ink">{t.name}</h2>
                    <p className="tnum mt-0.5 text-[14px] text-ink-muted">
                      {t.symbol} | מחזור {t.cycleNumber} | {t.unit}
                    </p>
                  </div>
                  <Badge tone={t.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {trainingStatusLabels[t.status]}
                  </Badge>
                </div>

                <dl className="mb-4 space-y-1.5 text-[15px]">
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">תאריכים</dt>
                    <dd className="tnum font-medium text-ink">
                      {formatDateHe(t.startDate)} — {formatDateHe(t.endDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">מפקד הכשרה</dt>
                    <dd className="font-medium text-ink">{commander?.displayName ?? ''}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">חיילים</dt>
                    <dd className="tnum font-medium text-ink">
                      {trainingsCopy.soldiers(t.soldierIds.length, t.pendingSoldiers.length)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">לו״ז</dt>
                    <dd>
                      <Badge tone={t.publishedScheduleId ? 'success' : 'warning'}>
                        {t.publishedScheduleId ? trainingsCopy.hasPublished : trainingsCopy.noPublished}
                      </Badge>
                    </dd>
                  </div>
                </dl>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSelectedTraining(t.id)
                    navigate('/schedule')
                  }}
                >
                  {buttons.openTraining}
                </Button>
              </div>
            )
          })}

          {/* Reserved course presets */}
          {coursePresets.map((p) => (
            <div key={p.id} className="glass-solid border-dashed p-5 opacity-75">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[22px] font-semibold text-ink">{presets.commandCourseTitle}</h2>
                  <p className="mt-0.5 text-[14px] text-ink-muted">{p.name}</p>
                </div>
                <Badge tone="neutral">{trainingsCopy.presetDisabled}</Badge>
              </div>
              <p className="text-[15px] text-ink-muted">{p.description}</p>
              <p className="mt-1 text-[14px] text-ink-muted">{presets.commandCourseBody}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
