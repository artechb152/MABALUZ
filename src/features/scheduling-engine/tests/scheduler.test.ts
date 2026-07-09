import { describe, expect, it } from 'vitest'
import type {
  ImportedTrainingTemplate,
  ScheduleEvent,
  ScheduleGenerationInput,
  Training
} from '@/types'
import { defaultTrainingSettings } from '@/data/mock/settings'
import { generateSchedule } from '../scheduler'
import { detectConflicts } from '../conflictDetector'
import { buildImpactReport } from '../impactReport'
import { toMinutes } from '@/lib/time'

// Deterministic fixture: 2030-06-02 is a Sunday. Three full weeks.
const T0 = '2030-01-01T00:00:00.000Z'

function makeTraining(overrides: Partial<Training> = {}): Training {
  return {
    id: 'tr-test',
    name: 'הכשרת בדיקות',
    symbol: 'בד-1',
    cycleNumber: '1',
    base: 'בה״ד 15',
    unit: 'בדיקות',
    startDate: '2030-06-02',
    endDate: '2030-06-20',
    commanderId: 'cmd-1',
    soldierIds: [],
    pendingSoldiers: [],
    settings: defaultTrainingSettings(),
    status: 'PLANNING',
    previousPublishedScheduleIds: [],
    createdAt: T0,
    updatedAt: T0,
    ...overrides
  }
}

function makeEvent(overrides: Partial<ScheduleEvent> & Pick<ScheduleEvent, 'id' | 'title' | 'date' | 'startTime' | 'endTime'>): ScheduleEvent {
  return {
    trainingId: 'tr-test',
    type: 'FLEXIBLE_CONTENT',
    flexibilityLevel: 'FLEXIBLE',
    durationMinutes: toMinutes(overrides.endTime) - toMinutes(overrides.startTime),
    isLocked: false,
    visibleToSoldiers: true,
    createdBy: 'test',
    createdAt: T0,
    updatedAt: T0,
    ...overrides
  }
}

function baseInput(overrides: Partial<ScheduleGenerationInput> = {}): ScheduleGenerationInput {
  const training = makeTraining()
  return {
    training,
    importedTrainingTemplate: null,
    existingDraftEvents: [],
    hardEvents: [],
    knownGuestLectures: [],
    sharedEvents: [],
    peakDays: [],
    manualFlexibleEvents: [],
    settings: training.settings,
    ...overrides
  }
}

const sharedEvent = makeEvent({
  id: 'ev-shared',
  title: 'לו״ז משותף: הרצאת בטיחות',
  type: 'SHARED',
  flexibilityLevel: 'LOCKED_SHARED',
  isLocked: true,
  date: '2030-06-04',
  startTime: '10:00',
  endTime: '12:00',
  sharedGroupId: 'grp-1'
})

const guestLecture = makeEvent({
  id: 'ev-guest',
  title: 'הרצאת חוץ: בדיקה',
  type: 'GUEST_LECTURE',
  flexibilityLevel: 'LOCKED_GUEST_LECTURE',
  isLocked: true,
  date: '2030-06-05',
  startTime: '13:00',
  endTime: '14:30',
  lecturerId: 'lect-1'
})

const peakDay = makeEvent({
  id: 'ev-peak',
  title: 'יום שיא: מטווחים',
  type: 'PEAK_DAY',
  flexibilityLevel: 'LOCKED_PEAK_DAY',
  isLocked: true,
  isFullDay: true,
  date: '2030-06-09',
  startTime: '08:00',
  endTime: '20:00',
  peakDayId: 'peak-1'
})

describe('hard event placement', () => {
  it('keeps shared, peak and guest lectures exactly where they were set', () => {
    const output = generateSchedule(
      baseInput({ sharedEvents: [sharedEvent], peakDays: [peakDay], knownGuestLectures: [guestLecture] })
    )
    const shared = output.schedule.events.find((e) => e.id === 'ev-shared')!
    expect(shared.date).toBe('2030-06-04')
    expect(shared.startTime).toBe('10:00')

    const guest = output.schedule.events.find((e) => e.id === 'ev-guest')!
    expect(guest.date).toBe('2030-06-05')
    expect(guest.startTime).toBe('13:00')

    const peak = output.schedule.events.find((e) => e.id === 'ev-peak')!
    expect(peak.isFullDay).toBe(true)
    // Peak day owns the whole day: nothing else is scheduled there.
    const sameDay = output.schedule.events.filter((e) => e.date === '2030-06-09')
    expect(sameDay).toHaveLength(1)
  })

  it('reports a BLOCKING conflict when two hard events overlap', () => {
    const clashingGuest = { ...guestLecture, date: sharedEvent.date, startTime: '11:00', endTime: '12:30' }
    const output = generateSchedule(
      baseInput({ sharedEvents: [sharedEvent], knownGuestLectures: [clashingGuest] })
    )
    const blocking = output.conflicts.filter((c) => c.severity === 'BLOCKING')
    expect(blocking.length).toBeGreaterThan(0)
    expect(blocking.some((c) => c.eventIds.includes('ev-shared') && c.eventIds.includes('ev-guest'))).toBe(true)
  })
})

describe('meal windows', () => {
  it('places lunch and dinner inside the allowed windows on every regular day', () => {
    const output = generateSchedule(baseInput())
    const meals = output.schedule.events.filter((e) => e.type === 'MEAL_BREAK')
    expect(meals.length).toBeGreaterThan(0)

    for (const meal of meals) {
      const start = toMinutes(meal.startTime)
      if (meal.title.includes('צהריים')) {
        expect(start).toBeGreaterThanOrEqual(toMinutes('11:30'))
        expect(start).toBeLessThanOrEqual(toMinutes('12:30'))
      } else {
        expect(start).toBeGreaterThanOrEqual(toMinutes('17:30'))
        expect(start).toBeLessThanOrEqual(toMinutes('18:30'))
        expect(toMinutes(meal.endTime)).toBeLessThanOrEqual(toMinutes('19:30'))
      }
      expect(meal.durationMinutes).toBe(60)
    }
  })

  it('does not place meals on a full peak day', () => {
    const output = generateSchedule(baseInput({ peakDays: [peakDay] }))
    const mealsOnPeak = output.schedule.events.filter(
      (e) => e.type === 'MEAL_BREAK' && e.date === '2030-06-09'
    )
    expect(mealsOnPeak).toHaveLength(0)
  })
})

describe('guest lecture reserve', () => {
  it('reserves time near the end when no import data exists (default reserve)', () => {
    const output = generateSchedule(baseInput())
    const reserve = output.schedule.events.filter((e) => e.title === 'זמן שמור להרצאות חוץ')
    expect(reserve.length).toBeGreaterThan(0)
    // All reserve blocks in the last third of the training.
    for (const r of reserve) {
      expect(r.date >= '2030-06-14').toBe(true)
      expect(r.visibleToSoldiers).toBe(false)
    }
  })

  it('subtracts known guest lecture time from the learned reserve', () => {
    const template: ImportedTrainingTemplate = {
      id: 'tpl-1',
      trainingId: 'tr-test',
      sourceFileNames: ['a.xlsx'],
      items: [],
      averageGuestLectureMinutesPerTraining: 240,
      createdAt: T0
    }
    const output = generateSchedule(
      baseInput({ importedTrainingTemplate: template, knownGuestLectures: [guestLecture] })
    )
    const reserveMinutes = output.schedule.events
      .filter((e) => e.title === 'זמן שמור להרצאות חוץ')
      .reduce((s, e) => s + e.durationMinutes, 0)
    // 240 learned - 90 known = 150 to reserve.
    expect(reserveMinutes).toBe(150)
  })
})

describe('not enough time', () => {
  it('reports impossible items with suggestions instead of dropping content silently', () => {
    // Two active days only, flooded with 40 hours of content.
    const training = makeTraining({ startDate: '2030-06-02', endDate: '2030-06-03' })
    const template: ImportedTrainingTemplate = {
      id: 'tpl-2',
      trainingId: 'tr-test',
      sourceFileNames: ['a.xlsx'],
      items: Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        title: `שיעור ${i + 1}`,
        normalizedTitle: `שיעור ${i + 1}`,
        averageDurationMinutes: 120,
        occurrences: 1,
        confidence: 'HIGH' as const,
        suggestedEventType: 'FLEXIBLE_CONTENT' as const,
        suggestedFlexibilityLevel: 'FLEXIBLE' as const,
        included: true,
        markedAsGuestLectureReserve: false,
        markedAsOneOff: false
      })),
      averageGuestLectureMinutesPerTraining: 0,
      createdAt: T0
    }
    const output = generateSchedule(
      baseInput({ training, settings: training.settings, importedTrainingTemplate: template })
    )
    expect(output.impossibleItems.length).toBeGreaterThan(0)
    expect(
      output.conflicts.some((c) => c.title === 'לא נמצא מספיק זמן לשיבוץ כל הרכיבים.')
    ).toBe(true)
    const titles = output.suggestions.map((s) => s.title)
    expect(titles).toContain('קיצור תכנים')
    expect(titles).toContain('הארכת הכשרה')
    expect(titles).toContain('הסרת רכיב')
    expect(titles).toContain('שיבוץ ידני')
  })
})

describe('balanced spread', () => {
  it('spreads flexible content across many days instead of piling up', () => {
    const template: ImportedTrainingTemplate = {
      id: 'tpl-3',
      trainingId: 'tr-test',
      sourceFileNames: ['a.xlsx'],
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `spread-${i}`,
        title: `תוכן ${i + 1}`,
        normalizedTitle: `תוכן ${i + 1}`,
        averageDurationMinutes: 90,
        occurrences: 1,
        confidence: 'MEDIUM' as const,
        suggestedEventType: 'FLEXIBLE_CONTENT' as const,
        suggestedFlexibilityLevel: 'FLEXIBLE' as const,
        included: true,
        markedAsGuestLectureReserve: false,
        markedAsOneOff: false
      })),
      averageGuestLectureMinutesPerTraining: 0,
      createdAt: T0
    }
    const output = generateSchedule(baseInput({ importedTrainingTemplate: template }))
    const flexible = output.schedule.events.filter((e) => e.type === 'FLEXIBLE_CONTENT')
    const distinctDays = new Set(flexible.map((e) => e.date))
    expect(distinctDays.size).toBeGreaterThanOrEqual(Math.min(10, 8))
  })
})

describe('determinism', () => {
  it('produces identical output for identical input', () => {
    const input = baseInput({ sharedEvents: [sharedEvent], knownGuestLectures: [guestLecture] })
    const a = generateSchedule(input)
    const b = generateSchedule(input)
    expect(JSON.stringify(a.schedule.events)).toBe(JSON.stringify(b.schedule.events))
    expect(a.conflicts.length).toBe(b.conflicts.length)
  })
})

describe('conflict detector (standalone)', () => {
  it('flags peak day overlapping a guest lecture as blocking but overridable', () => {
    const training = makeTraining()
    const clash = { ...guestLecture, date: peakDay.date }
    const conflicts = detectConflicts({
      events: [peakDay, clash],
      training,
      settings: training.settings
    })
    const c = conflicts.find((x) => x.title === 'יום שיא מתנגש עם הרצאת חוץ')
    expect(c).toBeDefined()
    expect(c!.severity).toBe('BLOCKING')
    expect(c!.canOverride).toBe(true)
  })

  it('flags meals outside the allowed windows', () => {
    const training = makeTraining()
    const badLunch = makeEvent({
      id: 'ev-lunch',
      title: 'ארוחת צהריים והפסקה',
      type: 'MEAL_BREAK',
      flexibilityLevel: 'SEMI_FLEXIBLE',
      date: '2030-06-03',
      startTime: '10:00',
      endTime: '11:00'
    })
    const conflicts = detectConflicts({
      events: [badLunch],
      training,
      settings: training.settings
    })
    expect(conflicts.some((c) => c.title === 'ארוחה מחוץ לחלון המותר')).toBe(true)
  })
})

describe('impact report', () => {
  it('reports moved and overwritten events between drafts', () => {
    const before = [
      makeEvent({ id: 'a', title: 'שיעור ניווט', date: '2030-06-03', startTime: '09:00', endTime: '10:00' }),
      makeEvent({ id: 'b', title: 'שיעור מפות', date: '2030-06-03', startTime: '10:00', endTime: '11:00' })
    ]
    const after = [
      makeEvent({ id: 'a', title: 'שיעור ניווט', date: '2030-06-04', startTime: '09:00', endTime: '10:00' }),
      makeEvent({ id: 'c', title: 'הרצאת חוץ חדשה', type: 'GUEST_LECTURE', date: '2030-06-03', startTime: '10:00', endTime: '11:00' })
    ]
    const report = buildImpactReport({
      summary: 'בדיקה',
      trainingId: 'tr-test',
      before,
      after
    })
    expect(report.movedEvents).toHaveLength(1)
    expect(report.movedEvents[0].toDate).toBe('2030-06-04')
    expect(report.overwrittenEvents).toHaveLength(1)
    expect(report.overwrittenEvents[0].overwrittenByTitle).toBe('הרצאת חוץ חדשה')
    expect(report.canUndo).toBe(true)
  })

  it('marks shared-event changes as not undoable and requiring approvals', () => {
    const sharedBefore = { ...sharedEvent }
    const sharedAfter = { ...sharedEvent, date: '2030-06-05' }
    const report = buildImpactReport({
      summary: 'בדיקה',
      trainingId: 'tr-test',
      before: [sharedBefore],
      after: [sharedAfter],
      sharedGroups: [
        {
          id: 'grp-1',
          title: 'הרצאת בטיחות',
          linkedTrainingIds: ['tr-test', 'tr-other'],
          createdByTrainingId: 'tr-test',
          createdByUserId: 'cmd-1',
          status: 'ACTIVE',
          approvals: [],
          currentEventIdsByTrainingId: {},
          pendingChangeRequestIds: []
        }
      ],
      allTrainings: [makeTraining(), makeTraining({ id: 'tr-other', name: 'הכשרה אחרת', commanderId: 'cmd-2' })]
    })
    expect(report.canUndo).toBe(false)
    expect(report.affectedTrainings.some((t) => t.trainingId === 'tr-other')).toBe(true)
    expect(report.approvalsRequired.some((a) => a.trainingId === 'tr-other')).toBe(true)
  })
})
