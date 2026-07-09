import { useMemo, useState } from 'react'
import { addMonths, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import type { ScheduleEvent } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Drawer } from '@/components/Drawer'
import { Icon } from '@/assets/icons/Icon'
import { clsx } from 'clsx'
import { dayNames, emptyStates, nav } from '@/lib/hebrewCopy'
import { useDraftSchedule, useSelectedTraining } from '@/app/hooks'
import { addDaysISO, formatDateHe, todayISO, weekStartISO } from '@/lib/time'
import { eventTypeColors } from '@/lib/theme'
import { EventEditorModal } from './EventEditorModal'
import { monthCopy } from './copy'

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
]

export function MonthViewPage() {
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const [monthAnchor, setMonthAnchor] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [drawerDate, setDrawerDate] = useState<string | null>(null)
  const [editorEvent, setEditorEvent] = useState<ScheduleEvent | null>(null)

  const weeks = useMemo(() => {
    const anchor = parseISO(monthAnchor)
    const first = weekStartISO(format(startOfMonth(anchor), 'yyyy-MM-dd'))
    const last = format(endOfMonth(anchor), 'yyyy-MM-dd')
    const result: string[][] = []
    let cursor = first
    while (cursor <= last) {
      result.push(Array.from({ length: 7 }, (_, i) => addDaysISO(cursor, i)))
      cursor = addDaysISO(cursor, 7)
    }
    return result
  }, [monthAnchor])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>()
    for (const e of draft?.events ?? []) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    return map
  }, [draft])

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.monthlySchedule} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  if (!training.settings.allowMonthView) {
    return (
      <div>
        <PageHeader title={nav.monthlySchedule} subtitle={training.name} />
        <EmptyState message={monthCopy.disabled} />
      </div>
    )
  }

  const anchor = parseISO(monthAnchor)
  const monthLabel = `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
  const today = todayISO()
  const monthKey = format(anchor, 'yyyy-MM')

  return (
    <div>
      <PageHeader title={nav.monthlySchedule} subtitle={training.name} />

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMonthAnchor(format(addMonths(anchor, -1), 'yyyy-MM-dd'))}
          aria-label="חודש קודם"
        >
          <Icon name="chevron-right" size={16} />
        </Button>
        <span className="min-w-32 text-center text-sm font-semibold text-ink">{monthLabel}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMonthAnchor(format(addMonths(anchor, 1), 'yyyy-MM-dd'))}
          aria-label="חודש הבא"
        >
          <Icon name="chevron-left" size={16} />
        </Button>
      </div>

      <div className="glass-solid overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-line bg-neutral-block/50">
          {dayNames.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-ink-muted">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-line last:border-b-0">
            {week.map((date) => {
              const events = eventsByDate.get(date) ?? []
              const inMonth = date.startsWith(monthKey)
              const inTraining = date >= training.startDate && date <= training.endDate
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setDrawerDate(date)}
                  className={clsx(
                    'focus-ring min-h-24 border-s border-line p-1.5 text-start align-top transition-colors first:border-s-0 hover:bg-primary-soft/40',
                    !inMonth && 'bg-neutral-block/40 opacity-60',
                    date === today && 'bg-primary-soft/50'
                  )}
                >
                  <div
                    className={clsx(
                      'tnum mb-1 text-xs',
                      inTraining ? 'font-semibold text-ink' : 'text-ink-muted'
                    )}
                  >
                    {format(parseISO(date), 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map((e) => (
                      <div key={e.id} className="flex items-center gap-1 text-[10px] text-ink">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: e.color ?? eventTypeColors[e.type] }}
                        />
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))}
                    {events.length > 3 ? (
                      <div className="text-[10px] text-ink-muted">{monthCopy.more(events.length - 3)}</div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <Drawer
        open={drawerDate != null}
        onClose={() => setDrawerDate(null)}
        title={drawerDate ? formatDateHe(drawerDate) : ''}
      >
        <div className="space-y-2">
          {(drawerDate ? (eventsByDate.get(drawerDate) ?? []) : []).map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEditorEvent(e)}
              className="focus-ring flex w-full items-center gap-2 rounded-xl border border-line bg-panel-solid px-3 py-2 text-start hover:border-primary/40"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: e.color ?? eventTypeColors[e.type] }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{e.title}</span>
              <span className="tnum text-xs text-ink-muted">
                {e.isFullDay ? 'יום מלא' : `${e.startTime}-${e.endTime}`}
              </span>
            </button>
          ))}
          {drawerDate && (eventsByDate.get(drawerDate) ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">{emptyStates.noSchedule}</p>
          ) : null}
        </div>
      </Drawer>

      <EventEditorModal
        open={editorEvent != null}
        onClose={() => setEditorEvent(null)}
        training={training}
        event={editorEvent}
      />
    </div>
  )
}
