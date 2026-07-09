import { useState } from 'react'
import type {
  FlexibilityLevel,
  ImportedContentItem,
  ImportedTrainingTemplate,
  ScheduleEventType
} from '@/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Input, Select } from '@/components/Input'
import { Toggle } from '@/components/Toggle'
import {
  buttons,
  confidenceLabels,
  dayNamesShort,
  eventTypeLabels,
  flexibilityLabels,
  importScreen
} from '@/lib/hebrewCopy'
import { importCopy } from './copy'
import { clsx } from 'clsx'

interface ReviewTableProps {
  template: ImportedTrainingTemplate
  onChange: (template: ImportedTrainingTemplate) => void
}

export function ReviewTable({ template, onChange }: ReviewTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  function patchItem(id: string, changes: Partial<ImportedContentItem>) {
    onChange({
      ...template,
      items: template.items.map((item) => (item.id === id ? { ...item, ...changes } : item))
    })
  }

  return (
    <div className="glass-solid overflow-x-auto p-0">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-neutral-block/70 text-xs text-ink-muted">
          <tr>
            <th className="px-3 py-2.5 text-start font-medium">{importScreen.detectedItems}</th>
            <th className="px-3 py-2.5 text-start font-medium">{importScreen.estimatedDuration}</th>
            <th className="px-3 py-2.5 text-start font-medium">{importScreen.occurrences}</th>
            <th className="px-3 py-2.5 text-start font-medium">{importScreen.confidence}</th>
            <th className="px-3 py-2.5 text-start font-medium">{importCopy.typeColumn}</th>
            <th className="px-3 py-2.5 text-start font-medium">{importCopy.flexColumn}</th>
            <th className="px-3 py-2.5 text-start font-medium">{importCopy.daysColumn}</th>
            <th className="px-3 py-2.5 text-start font-medium">{importScreen.includeInSchedule}</th>
            <th className="px-3 py-2.5 text-start font-medium" />
          </tr>
        </thead>
        <tbody>
          {template.items.map((item) => {
            const editing = editingId === item.id
            const dimmed = !item.included || item.markedAsOneOff
            return (
              <tr key={item.id} className={clsx('border-t border-line', dimmed && 'opacity-55')}>
                <td className="px-3 py-2">
                  {editing ? (
                    <Input
                      value={item.title}
                      onChange={(e) => patchItem(item.id, { title: e.target.value })}
                      className="min-w-40"
                    />
                  ) : (
                    <div>
                      <div className="font-medium text-ink">{item.title}</div>
                      {item.notes ? <div className="text-xs text-ink-muted">{item.notes}</div> : null}
                      <div className="mt-0.5 flex gap-1.5">
                        {item.markedAsGuestLectureReserve ? (
                          <Badge tone="primary">{importCopy.reserveOn}</Badge>
                        ) : null}
                        {item.markedAsOneOff ? <Badge tone="neutral">{importCopy.oneOffOn}</Badge> : null}
                      </div>
                    </div>
                  )}
                </td>
                <td className="tnum px-3 py-2 text-ink">
                  {editing ? (
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      value={item.averageDurationMinutes}
                      onChange={(e) =>
                        patchItem(item.id, { averageDurationMinutes: Number(e.target.value) || 15 })
                      }
                      className="w-20"
                    />
                  ) : (
                    `${item.averageDurationMinutes} דק׳`
                  )}
                </td>
                <td className="tnum px-3 py-2 text-ink-muted">{item.occurrences}</td>
                <td className="px-3 py-2">
                  <Badge
                    tone={
                      item.confidence === 'HIGH' ? 'success' : item.confidence === 'MEDIUM' ? 'warning' : 'neutral'
                    }
                  >
                    {confidenceLabels[item.confidence]}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={item.suggestedEventType}
                    onChange={(e) =>
                      patchItem(item.id, { suggestedEventType: e.target.value as ScheduleEventType })
                    }
                    className="min-w-32"
                  >
                    {(Object.keys(eventTypeLabels) as ScheduleEventType[]).map((t) => (
                      <option key={t} value={t}>
                        {eventTypeLabels[t]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={item.suggestedFlexibilityLevel}
                    onChange={(e) =>
                      patchItem(item.id, {
                        suggestedFlexibilityLevel: e.target.value as FlexibilityLevel
                      })
                    }
                    className="min-w-32"
                  >
                    {(Object.keys(flexibilityLabels) as FlexibilityLevel[]).map((f) => (
                      <option key={f} value={f}>
                        {flexibilityLabels[f]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-3 py-2 text-xs text-ink-muted">
                  {(item.typicalDayIndexes ?? []).map((d) => dayNamesShort[d]).join(' ')}
                  {item.typicalStartTime ? <span className="tnum"> | {item.typicalStartTime}</span> : null}
                </td>
                <td className="px-3 py-2">
                  <Toggle
                    checked={item.included}
                    onChange={(v) => patchItem(item.id, { included: v })}
                    label={item.included ? undefined : importScreen.ignoreItem}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(editing ? null : item.id)}>
                      {editing ? buttons.finish : importScreen.editItem}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patchItem(item.id, {
                          markedAsGuestLectureReserve: !item.markedAsGuestLectureReserve
                        })
                      }
                    >
                      {importScreen.markAsReserve}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patchItem(item.id, { markedAsOneOff: !item.markedAsOneOff, included: item.markedAsOneOff })
                      }
                    >
                      {importScreen.markAsOneOff}
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
