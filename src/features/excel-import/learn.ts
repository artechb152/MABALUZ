import type {
  ExcelParsedSchedule,
  FlexibilityLevel,
  ImportConfidence,
  ImportedContentItem,
  ImportedTrainingTemplate,
  ScheduleEventType
} from '@/types'
import { toMinutes } from '@/lib/time'
import { nowISO } from '@/lib/time'

// Rule-based learning over previous training schedules. No AI in v1 — the
// heuristics below keep results stable and explainable (see the locked
// "ניתוח AI — בפיתוח" card in the import screen).

export function normalizeTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/["'״׳]/g, '"')
    .replace(/\d+\s*$/, '')
    .replace(/[.،,:;!?-]+$/, '')
    .trim()
}

function suggestType(title: string): ScheduleEventType {
  if (title.includes('הרצאת חוץ') || title.includes('מרצה')) return 'GUEST_LECTURE'
  if (title.includes('ארוח')) return 'MEAL_BREAK'
  if (title.includes('מסדר')) return 'FORMATION'
  if (title.includes('זמן מפקד')) return 'COMMANDER_TIME'
  if (title.includes('יום שיא') || title.includes('מטווח')) return 'PEAK_DAY'
  if (title.includes('גיבוש') || title.includes('פעילות') || title.includes('סיור')) return 'TEAM_ACTIVITY'
  return 'FLEXIBLE_CONTENT'
}

function suggestFlexibility(type: ScheduleEventType): FlexibilityLevel {
  switch (type) {
    case 'GUEST_LECTURE':
      return 'LOCKED_GUEST_LECTURE'
    case 'PEAK_DAY':
      return 'LOCKED_PEAK_DAY'
    case 'SHARED':
      return 'LOCKED_SHARED'
    case 'MEAL_BREAK':
    case 'FORMATION':
    case 'COMMANDER_TIME':
      return 'SEMI_FLEXIBLE'
    default:
      return 'FLEXIBLE'
  }
}

function mode(values: number[]): number[] {
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  const max = Math.max(...counts.values())
  return [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v)
}

export function learnFromParsedSchedules(
  parsed: ExcelParsedSchedule[],
  trainingId: string
): ImportedTrainingTemplate {
  interface Bucket {
    title: string
    normalized: string
    durations: number[]
    dayIndexes: number[]
    startTimes: string[]
    files: Set<string>
    count: number
  }
  const buckets = new Map<string, Bucket>()

  for (const schedule of parsed) {
    for (const block of schedule.blocks) {
      const normalized = normalizeTitle(block.title)
      if (!normalized) continue
      const bucket = buckets.get(normalized) ?? {
        title: block.title.trim(),
        normalized,
        durations: [],
        dayIndexes: [],
        startTimes: [],
        files: new Set<string>(),
        count: 0
      }
      bucket.durations.push(toMinutes(block.endTime) - toMinutes(block.startTime))
      bucket.dayIndexes.push(block.dayIndex)
      bucket.startTimes.push(block.startTime)
      bucket.files.add(schedule.fileName)
      bucket.count += 1
      buckets.set(normalized, bucket)
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count || a.normalized.localeCompare(b.normalized))

  const items: ImportedContentItem[] = sorted.map((b, i) => {
    const avgDuration = Math.max(
      15,
      Math.round(b.durations.reduce((s, d) => s + d, 0) / b.durations.length / 15) * 15
    )
    const confidence: ImportConfidence = b.files.size >= 2 ? 'HIGH' : b.count >= 2 ? 'MEDIUM' : 'LOW'
    const type = suggestType(b.normalized)
    const isMeal = type === 'MEAL_BREAK'
    return {
      id: `imp-${i + 1}`,
      title: b.title,
      normalizedTitle: b.normalized,
      averageDurationMinutes: avgDuration,
      occurrences: b.count,
      confidence,
      suggestedEventType: type,
      suggestedFlexibilityLevel: suggestFlexibility(type),
      notes: isMeal
        ? 'ארוחות משובצות אוטומטית על ידי המערכת.'
        : confidence === 'LOW'
          ? 'הופיע פעם אחת בלבד — ייתכן שמדובר ברכיב חד-פעמי.'
          : undefined,
      included: !isMeal,
      markedAsGuestLectureReserve: false,
      markedAsOneOff: false,
      typicalDayIndexes: mode(b.dayIndexes),
      typicalStartTime: [...b.startTimes].sort()[0],
      sourceFileNames: [...b.files]
    }
  })

  // Average total guest-lecture minutes per source schedule (drives the reserve).
  const fileCount = Math.max(1, parsed.length)
  const guestMinutesTotal = parsed.reduce(
    (sum, schedule) =>
      sum +
      schedule.blocks
        .filter((bl) => suggestType(normalizeTitle(bl.title)) === 'GUEST_LECTURE')
        .reduce((s, bl) => s + (toMinutes(bl.endTime) - toMinutes(bl.startTime)), 0),
    0
  )

  const lunch = items.find((i) => i.suggestedEventType === 'MEAL_BREAK' && i.normalizedTitle.includes('צהר'))
  const dinner = items.find((i) => i.suggestedEventType === 'MEAL_BREAK' && i.normalizedTitle.includes('ערב'))

  return {
    id: `template-${trainingId}`,
    trainingId,
    sourceFileNames: parsed.map((p) => p.fileName),
    items,
    averageGuestLectureMinutesPerTraining: Math.round(guestMinutesTotal / fileCount),
    typicalLunchStart: lunch?.typicalStartTime,
    typicalDinnerStart: dinner?.typicalStartTime,
    createdAt: nowISO()
  }
}
