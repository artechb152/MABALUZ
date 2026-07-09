import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Wordmark } from '@/components/Wordmark'
import { Icon } from '@/assets/icons/Icon'
import { app, exportCopy } from '@/lib/hebrewCopy'
import { usePublishedSchedule, useSelectedTraining } from '@/app/hooks'
import { addDaysISO, formatDateHe, todayISO, weekStartISO } from '@/lib/time'
import { WeekGrid } from './WeekGrid'
import { displayCopy, soldierCopy } from './copy'

/** Full-screen projection view (route /display, outside the app shell). */
export function DisplayModePage() {
  const navigate = useNavigate()
  const training = useSelectedTraining()
  const published = usePublishedSchedule(training)
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()))

  return (
    <div className="min-h-full p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Wordmark size="md" />
          <div>
            <h1 className="t-display">
              {training?.name ?? app.name} — {exportCopy.projectionView}
            </h1>
            <p className="tnum text-sm text-ink-muted">
              {formatDateHe(weekStart)} — {formatDateHe(addDaysISO(weekStart, 6))} | {displayCopy.publishedOnly}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label="שבוע קודם">
            <Icon name="chevron-right" size={18} />
          </Button>
          <Button variant="ghost" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label="שבוע הבא">
            <Icon name="chevron-left" size={18} />
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            {displayCopy.back}
          </Button>
        </div>
      </div>

      {training && published ? (
        <WeekGrid
          events={published.events.filter((e) => e.visibleToSoldiers)}
          weekStart={weekStart}
          settings={training.settings}
          editable={false}
          display
        />
      ) : (
        <EmptyState message={soldierCopy.noPublished} />
      )}
    </div>
  )
}
