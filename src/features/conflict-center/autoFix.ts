import type { Schedule, Training } from '@/types'
import { getDayWindows } from '@/features/scheduling-engine'
import { toHHMM, toMinutes } from '@/lib/time'
import { moveDraftEvent } from '@/data/services/scheduleService'

/**
 * Recommended automatic fix for a flexible event that overlaps something:
 * move it to the nearest free slot — same day first, then forward through the
 * training. Returns the new placement or null when nothing fits.
 */
export async function autoMoveToNearestFreeSlot(
  training: Training,
  draft: Schedule,
  eventId: string
): Promise<{ date: string; startTime: string } | null> {
  const event = draft.events.find((e) => e.id === eventId)
  if (!event || event.isLocked) return null

  const windows = getDayWindows(training, training.settings)
  const startIndex = Math.max(
    0,
    windows.findIndex((w) => w.date >= event.date)
  )
  const ordered = [...windows.slice(startIndex), ...windows.slice(0, startIndex)]
  const lockedDates = new Set(draft.lockedDates ?? [])

  for (const window of ordered) {
    if (lockedDates.has(window.date)) continue
    const dayEvents = draft.events.filter(
      (e) => e.id !== eventId && e.date === window.date
    )
    if (dayEvents.some((e) => e.isFullDay)) continue

    for (let start = window.startMinutes; start + event.durationMinutes <= window.endMinutes; start += 15) {
      const end = start + event.durationMinutes
      const clash = dayEvents.some(
        (e) => start < toMinutes(e.endTime) && toMinutes(e.startTime) < end
      )
      if (!clash) {
        // Skip the event's current position (that is the conflicted one).
        if (window.date === event.date && start === toMinutes(event.startTime)) continue
        await moveDraftEvent(training.id, eventId, {
          date: window.date,
          startTime: toHHMM(start),
          endTime: toHHMM(end)
        })
        return { date: window.date, startTime: toHHMM(start) }
      }
    }
  }
  return null
}
