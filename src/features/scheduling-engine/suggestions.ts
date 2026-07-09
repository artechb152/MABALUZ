import type {
  ImpossibleScheduleItem,
  ReschedulingSuggestion,
  ScheduleConflict,
  ScheduleEvent,
  SuggestedAction
} from '@/types'
import { makeIdFactory } from '@/lib/ids'

/**
 * Builds resolution suggestions. Simple cases get one recommended fix; complex
 * ones get several options; the "not enough time" case gets the full menu.
 */
export function buildSuggestions(input: {
  conflicts: ScheduleConflict[]
  impossibleItems: ImpossibleScheduleItem[]
  events: ScheduleEvent[]
  hasGuestReserve: boolean
}): ReschedulingSuggestion[] {
  const nextId = makeIdFactory('sugg')
  const nextActionId = makeIdFactory('act')
  const suggestions: ReschedulingSuggestion[] = []

  // Flexible-vs-hard overlaps: one recommended automatic fix — move the flexible event.
  const softOverlaps = input.conflicts.filter(
    (c) => c.severity === 'WARNING' && c.title === 'רכיב גמיש חופף לרכיב קשיח'
  )
  for (const conflict of softOverlaps) {
    const action: SuggestedAction = {
      id: nextActionId(),
      kind: 'MOVE_EVENT',
      description: 'הזזת הרכיב הגמיש למועד פנוי קרוב',
      eventId: conflict.eventIds[0]
    }
    suggestions.push({
      id: nextId(),
      title: 'פתרון אוטומטי',
      description: 'המערכת תזיז את הרכיב הגמיש למועד הפנוי הקרוב ביותר.',
      recommended: true,
      actions: [action],
      impactSummary: 'רכיב אחד יוזז. אין השפעה על רכיבים קשיחים.'
    })
    conflict.suggestedResolutionIds.push(suggestions[suggestions.length - 1].id)
  }

  // Hard-vs-hard: manual resolution required.
  const hardConflicts = input.conflicts.filter((c) => c.severity === 'BLOCKING')
  for (const conflict of hardConflicts) {
    const manual: ReschedulingSuggestion = {
      id: nextId(),
      title: 'דורש אישור ידני',
      description:
        'שני רכיבים קשיחים מתנגשים. יש לבחור איזה רכיב יוזז, בתיאום מול הגורמים הרלוונטיים.',
      recommended: true,
      actions: [
        {
          id: nextActionId(),
          kind: 'MANUAL_RESOLVE',
          description: 'שיבוץ ידני של אחד הרכיבים',
          eventId: conflict.eventIds[0]
        }
      ],
      impactSummary: 'שינוי רכיב קשיח עשוי לדרוש אישורים נוספים.'
    }
    suggestions.push(manual)
    conflict.suggestedResolutionIds.push(manual.id)
  }

  // Not enough time: the full menu (never drop content silently).
  if (input.impossibleItems.length > 0) {
    const totalMissing = input.impossibleItems.reduce((sum, item) => sum + item.durationMinutes, 0)

    const shorten: ReschedulingSuggestion = {
      id: nextId(),
      title: 'קיצור תכנים',
      description: 'קיצור מספר שיעורים גמישים כדי לפנות את הזמן החסר.',
      recommended: true,
      actions: input.impossibleItems.map((item) => ({
        id: nextActionId(),
        kind: 'SHORTEN_EVENT' as const,
        description: `קיצור "${item.title}"`,
        shortenToMinutes: Math.max(30, Math.round((item.durationMinutes * 0.75) / 15) * 15)
      })),
      impactSummary: `נדרשות כ-${Math.ceil(totalMissing / 60)} שעות נוספות. קיצור תכנים גמישים יכול לפנות את רוב הזמן.`
    }

    const extend: ReschedulingSuggestion = {
      id: nextId(),
      title: 'הארכת הכשרה',
      description: 'הארכת ההכשרה במספר הימים המינימלי הנדרש.',
      recommended: false,
      actions: [
        {
          id: nextActionId(),
          kind: 'EXTEND_TRAINING',
          description: 'הארכת ההכשרה',
          extendByDays: Math.max(1, Math.ceil(totalMissing / (10 * 60)))
        }
      ],
      impactSummary: 'שינוי תאריך הסיום ישפיע על כלל המסגרת.'
    }

    const remove: ReschedulingSuggestion = {
      id: nextId(),
      title: 'הסרת רכיב',
      description: 'הסרת רכיב תוכן אופציונלי אחד או יותר.',
      recommended: false,
      actions: input.impossibleItems.map((item) => ({
        id: nextActionId(),
        kind: 'REMOVE_EVENT' as const,
        description: `הסרת "${item.title}"`
      })),
      impactSummary: 'התכנים שיוסרו לא ישובצו בלו״ז.'
    }

    const manual: ReschedulingSuggestion = {
      id: nextId(),
      title: 'שיבוץ ידני',
      description: 'המפקד ישבץ את הרכיבים החסרים ידנית.',
      recommended: false,
      actions: [
        {
          id: nextActionId(),
          kind: 'MANUAL_RESOLVE',
          description: 'פתיחת בניית הלו״ז לשיבוץ ידני'
        }
      ],
      impactSummary: 'ללא שינוי אוטומטי.'
    }

    suggestions.push(shorten, extend, remove, manual)

    if (input.hasGuestReserve) {
      suggestions.push({
        id: nextId(),
        title: 'שימוש בזמן השמור להרצאות חוץ',
        description: 'אם אין הרצאת חוץ צפויה, ניתן לשבץ תכנים בזמן השמור.',
        recommended: false,
        actions: [
          {
            id: nextActionId(),
            kind: 'USE_GUEST_RESERVE',
            description: 'שיבוץ תכנים בזמן השמור להרצאות חוץ'
          }
        ],
        impactSummary: 'הזמן השמור להרצאות חוץ יקטן בהתאם.'
      })
    }

    // Link the "not enough time" conflict to all of these options.
    const notEnough = input.conflicts.find((c) => c.title === 'לא נמצא מספיק זמן לשיבוץ כל הרכיבים.')
    if (notEnough) {
      notEnough.suggestedResolutionIds.push(
        ...suggestions.slice(suggestions.length - (input.hasGuestReserve ? 5 : 4)).map((s) => s.id)
      )
    }
  }

  return suggestions
}
