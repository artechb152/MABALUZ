import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import type { ScheduleEvent } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Tabs } from '@/components/Tabs'
import { EmptyState } from '@/components/EmptyState'
import { Drawer } from '@/components/Drawer'
import { Icon } from '@/assets/icons/Icon'
import { buttons, emptyStates, impact, nav, statusLabels } from '@/lib/hebrewCopy'
import {
  useDraftSchedule,
  usePublishedSchedule,
  useSelectedTraining
} from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { addDaysISO, timeRangesOverlap, todayISO, weekStartISO, toMinutes, toHHMM } from '@/lib/time'
import { detectConflicts, buildImpactReport } from '@/features/scheduling-engine'
import { discardDraft, moveDraftEvent, setDayLock, swapDraftEvents } from '@/data/services/scheduleService'
import { ScheduleLegend, WeekGrid } from './WeekGrid'
import { EventEditorModal } from './EventEditorModal'
import { PublishFlow } from './PublishFlow'
import { GenerateFlow } from './GenerateFlow'
import { ImpactReportView } from '@/features/conflict-center/ImpactReportView'
import { builderCopy } from './copy'

export function ScheduleBuilderPage() {
  const navigate = useNavigate()
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const published = usePublishedSchedule(training)
  const { users, trainings, sharedGroups, lecturers } = useDb()

  const [view, setView] = useState<'draft' | 'published'>('draft')
  const [weekStart, setWeekStart] = useState(() => weekStartISO(todayISO()))
  const [editorEvent, setEditorEvent] = useState<ScheduleEvent | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [impactOpen, setImpactOpen] = useState(false)
  const [dropWarning, setDropWarning] = useState<string | null>(null)
  const [swapNotice, setSwapNotice] = useState<
    { key: number; changes: { title: string; oldMin: number; newMin: number }[] } | null
  >(null)

  const schedule = view === 'draft' ? draft : published
  const editable = view === 'draft'

  // Auto-dismiss the swap notice after a while.
  useEffect(() => {
    if (!swapNotice) return
    const id = setTimeout(() => setSwapNotice(null), 10000)
    return () => clearTimeout(id)
  }, [swapNotice])

  const conflicts = useMemo(() => {
    if (!training || !draft) return []
    return detectConflicts({
      events: draft.events,
      training,
      settings: training.settings,
      lecturers,
      lockedDates: draft.lockedDates
    })
  }, [training, draft, lecturers])

  const conflictedIds = useMemo(() => {
    const set = new Set<string>()
    for (const c of conflicts) for (const id of c.eventIds) set.add(id)
    return set
  }, [conflicts])

  const diverged = useMemo(() => {
    if (!draft || !published) return false
    if (draft.events.length !== published.events.length) return true
    const key = (e: ScheduleEvent) => `${e.title}|${e.date}|${e.startTime}|${e.endTime}|${e.type}`
    const a = draft.events.map(key).sort().join(';')
    const b = published.events.map(key).sort().join(';')
    return a !== b
  }, [draft, published])

  const impactReport = useMemo(() => {
    if (!training || !draft || !impactOpen) return null
    return buildImpactReport({
      summary: 'השוואת הטיוטה מול הלו״ז שפורסם.',
      trainingId: training.id,
      before: published?.events ?? [],
      after: draft.events,
      allTrainings: trainings,
      allUsers: users,
      sharedGroups
    })
  }, [training, draft, published, impactOpen, trainings, users, sharedGroups])

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.scheduleBuilder} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  async function handleDrop(eventId: string, newDate: string, newStartTime: string) {
    if (!draft || !training) return
    const event = draft.events.find((e) => e.id === eventId)
    if (!event) return
    const newStart = toMinutes(newStartTime)
    const newEnd = newStart + event.durationMinutes
    const hardClash = draft.events.find(
      (e) =>
        e.id !== eventId &&
        e.date === newDate &&
        e.isLocked &&
        timeRangesOverlap(toHHMM(newStart), toHHMM(newEnd), e.startTime, e.endTime)
    )
    if (hardClash) {
      setDropWarning(`${builderCopy.dropBlockedByHard} "${hardClash.title}"`)
      return
    }
    setDropWarning(null)
    await moveDraftEvent(training.id, eventId, {
      date: newDate,
      startTime: toHHMM(newStart),
      endTime: toHHMM(newEnd)
    })
  }

  async function handleDiscard() {
    if (!training) return
    if (window.confirm(builderCopy.discardConfirm)) {
      await discardDraft(training.id)
    }
  }

  async function handleSwap(aId: string, bId: string) {
    if (!training || !draft) return
    const a = draft.events.find((e) => e.id === aId)
    const b = draft.events.find((e) => e.id === bId)
    if (!a || !b) return
    await swapDraftEvents(training.id, aId, bId)
    // Slot swap means each event inherits the other's duration — surface that.
    if (a.durationMinutes !== b.durationMinutes) {
      setSwapNotice({
        key: Date.now(),
        changes: [
          { title: a.title, oldMin: a.durationMinutes, newMin: b.durationMinutes },
          { title: b.title, oldMin: b.durationMinutes, newMin: a.durationMinutes }
        ]
      })
    }
  }

  return (
    <div>
      <PageHeader
        title={nav.scheduleBuilder}
        subtitle={training.name}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setGenerateOpen(true)}>
              <Icon name="calendar" size={15} />
              {buttons.generateSchedule}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditorEvent(null)
                setEditorOpen(true)
              }}
            >
              <Icon name="plus" size={15} />
              {buttons.addEvent}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPublishOpen(true)}>
              <Icon name="publish" size={15} />
              {buttons.publish}
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="week-nav-btn"
            onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
            aria-label="שבוע קודם"
          >
            <Icon name="chevron-right" size={16} />
          </button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(weekStartISO(todayISO()))}>
            {buttons.today}
          </Button>
          <button
            type="button"
            className="week-nav-btn"
            onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
            aria-label="שבוע הבא"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <Tabs
            items={[
              { key: 'draft', label: statusLabels.draft },
              { key: 'published', label: statusLabels.published }
            ]}
            active={view}
            onChange={(k) => setView(k as 'draft' | 'published')}
          />
          {diverged ? (
            <Badge tone="warning">{builderCopy.unpublishedChanges}</Badge>
          ) : (
            <Badge tone="success">{builderCopy.noDivergence}</Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setImpactOpen(true)}>
            {buttons.showImpact}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleDiscard()}>
            {buttons.discardChanges}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Icon name="print" size={15} />
            {buttons.exportPdf}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/display')}>
            <Icon name="display" size={15} />
            {buttons.displayMode}
          </Button>
        </div>
      </div>

      {/* Conflict strip */}
      {editable && conflicts.length > 0 ? (
        <button
          type="button"
          onClick={() => navigate('/conflicts')}
          className="focus-ring mb-4 flex w-full items-center justify-between rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-warning"
        >
          <span className="flex items-center gap-2">
            <Icon name="conflict" size={16} />
            {builderCopy.conflictsFound(conflicts.length)}
          </span>
          <span className="font-medium underline">{builderCopy.goToConflicts}</span>
        </button>
      ) : null}

      {dropWarning ? (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
          <span>{dropWarning}</span>
          <Button variant="ghost" size="sm" onClick={() => setDropWarning(null)}>
            {buttons.close}
          </Button>
        </div>
      ) : null}

      {!editable ? (
        <div className="mb-4 rounded-xl bg-primary-soft px-4 py-2.5 text-sm text-primary-hover">
          {builderCopy.publishedView}
        </div>
      ) : null}

      {schedule && schedule.events.length > 0 ? (
        <div className="mb-2 flex justify-end">
          <ScheduleLegend events={schedule.events} />
        </div>
      ) : null}

      {schedule ? (
        <WeekGrid
          events={schedule.events}
          weekStart={weekStart}
          settings={training.settings}
          editable={editable}
          lockedDates={draft?.lockedDates}
          conflictedEventIds={editable ? conflictedIds : undefined}
          onEventClick={(e) => {
            if (!editable) return
            setEditorEvent(e)
            setEditorOpen(true)
          }}
          onEventDrop={editable ? (id, d, t) => void handleDrop(id, d, t) : undefined}
          onEventSwap={editable ? (a, b) => void handleSwap(a, b) : undefined}
          onToggleDayLock={
            editable ? (date, locked) => void setDayLock(training.id, date, locked) : undefined
          }
        />
      ) : (
        <EmptyState message={emptyStates.noSchedule} />
      )}

      <EventEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        training={training}
        event={editorEvent}
        defaultDate={weekStart}
      />

      {draft ? (
        <>
          <PublishFlow
            open={publishOpen}
            onClose={() => setPublishOpen(false)}
            training={training}
            draft={draft}
            published={published}
          />
          <GenerateFlow
            open={generateOpen}
            onClose={() => setGenerateOpen(false)}
            training={training}
            draft={draft}
          />
        </>
      ) : null}

      <Drawer open={impactOpen} onClose={() => setImpactOpen(false)} title={impact.title}>
        {impactReport ? <ImpactReportView report={impactReport} /> : null}
      </Drawer>

      {/* Duration-change notice after swapping blocks of different lengths */}
      {swapNotice ? (
        <div
          key={swapNotice.key}
          className="glass-solid fixed bottom-6 left-1/2 z-50 w-[min(480px,90vw)] -translate-x-1/2 animate-[fadeSlideIn_0.35s_ease] border-warning/50 p-4 shadow-pop"
          role="status"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="t-body flex items-center gap-2 font-medium text-warning">
              <Icon name="warning" size={17} />
              {builderCopy.swapNoticeTitle}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSwapNotice(null)}>
              <Icon name="close" size={14} />
            </Button>
          </div>
          <div className="space-y-1.5">
            {swapNotice.changes.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Icon name="clock" size={15} className="shrink-0 text-ink-muted" />
                <span className="t-body min-w-0 flex-1 truncate font-light text-ink">
                  {builderCopy.swapDurationChange(c.title, c.oldMin, c.newMin)}
                </span>
                <span
                  className={clsx(
                    'tnum t-detail shrink-0 rounded-full border px-2 py-0.5 font-medium',
                    c.newMin < c.oldMin ? 'border-danger/45 text-danger' : 'border-success/45 text-success'
                  )}
                >
                  {c.newMin < c.oldMin ? '-' : '+'}
                  {Math.abs(c.newMin - c.oldMin)} דק׳
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
