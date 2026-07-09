import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcelSchedule } from '../parser'
import { learnFromParsedSchedules, normalizeTitle } from '../learn'

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function buildWorkbookBuffer(cells: Record<string, string>, merges?: XLSX.Range[]): ArrayBuffer {
  // cells: { "08:00|0": "מסדר בוקר" } — time + day index.
  const times: string[] = []
  for (let m = 8 * 60; m < 20 * 60; m += 15) {
    times.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  const rows: string[][] = [['שעה', ...DAYS]]
  for (const t of times) {
    const row = [t, ...Array<string>(7).fill('')]
    for (let d = 0; d < 7; d++) {
      const value = cells[`${t}|${d}`]
      if (value) row[d + 1] = value
    }
    rows.push(row)
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  if (merges) sheet['!merges'] = merges
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'לוז')
  const out = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return out
}

function fill(cells: Record<string, string>, day: number, start: string, end: string, title: string) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  for (let m = toMin(start); m < toMin(end); m += 15) {
    const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
    cells[`${t}|${day}`] = title
  }
}

describe('excel parser', () => {
  it('coalesces consecutive identical 15-minute cells into one block', () => {
    const cells: Record<string, string> = {}
    fill(cells, 0, '08:15', '10:00', 'מבוא לעבודה מודיעינית')
    fill(cells, 0, '12:00', '13:00', 'ארוחת צהריים והפסקה')
    const parsed = parseExcelSchedule(buildWorkbookBuffer(cells), 'test.xlsx')

    const intro = parsed.blocks.find((b) => b.title === 'מבוא לעבודה מודיעינית')
    expect(intro).toBeDefined()
    expect(intro!.dayIndex).toBe(0)
    expect(intro!.startTime).toBe('08:15')
    expect(intro!.endTime).toBe('10:00')

    const lunch = parsed.blocks.find((b) => b.title.includes('צהריים'))
    expect(lunch!.startTime).toBe('12:00')
    expect(lunch!.endTime).toBe('13:00')
  })

  it('handles merged cells by forward-filling the range', () => {
    const cells: Record<string, string> = {}
    cells['08:15|1'] = 'תרגול צוותי' // only the top cell of the merge holds text
    const merges: XLSX.Range[] = [{ s: { r: 2, c: 2 }, e: { r: 8, c: 2 } }] // rows 08:15..09:45, day שני
    const parsed = parseExcelSchedule(buildWorkbookBuffer(cells, merges), 'merged.xlsx')
    const block = parsed.blocks.find((b) => b.title === 'תרגול צוותי')
    expect(block).toBeDefined()
    expect(block!.startTime).toBe('08:15')
    expect(block!.endTime).toBe('10:00')
  })
})

describe('rule-based learning', () => {
  function parsedPair() {
    const a: Record<string, string> = {}
    fill(a, 0, '08:00', '08:15', 'מסדר בוקר')
    fill(a, 1, '08:00', '08:15', 'מסדר בוקר')
    fill(a, 0, '08:15', '10:00', 'כתיבה מודיעינית')
    fill(a, 2, '13:00', '14:30', 'הרצאת חוץ: מבוא')
    fill(a, 0, '12:00', '13:00', 'ארוחת צהריים והפסקה')

    const b: Record<string, string> = {}
    fill(b, 3, '08:00', '08:15', 'מסדר בוקר')
    fill(b, 1, '10:15', '12:00', 'כתיבה מודיעינית')
    fill(b, 4, '13:00', '14:30', 'הרצאת חוץ: ניתוח אירועים')
    fill(b, 4, '15:15', '17:00', 'סדנת צילום')

    return [
      parseExcelSchedule(buildWorkbookBuffer(a), 'a.xlsx'),
      parseExcelSchedule(buildWorkbookBuffer(b), 'b.xlsx')
    ]
  }

  it('grades confidence by cross-file recurrence', () => {
    const template = learnFromParsedSchedules(parsedPair(), 'tr-x')
    const formation = template.items.find((i) => i.normalizedTitle === 'מסדר בוקר')!
    expect(formation.confidence).toBe('HIGH')
    expect(formation.suggestedEventType).toBe('FORMATION')

    const oneOff = template.items.find((i) => i.title === 'סדנת צילום')!
    expect(oneOff.confidence).toBe('LOW')
    expect(oneOff.notes).toContain('חד-פעמי')
  })

  it('computes average guest lecture minutes per source schedule', () => {
    const template = learnFromParsedSchedules(parsedPair(), 'tr-x')
    // file a: 90 minutes, file b: 90 minutes -> average 90.
    expect(template.averageGuestLectureMinutesPerTraining).toBe(90)
  })

  it('excludes meals from inclusion (engine places them automatically)', () => {
    const template = learnFromParsedSchedules(parsedPair(), 'tr-x')
    const lunch = template.items.find((i) => i.suggestedEventType === 'MEAL_BREAK')!
    expect(lunch.included).toBe(false)
    expect(template.typicalLunchStart).toBe('12:00')
  })

  it('normalizes titles (trailing numbers/punctuation, spacing)', () => {
    expect(normalizeTitle('תרגול  מסכם 2')).toBe('תרגול מסכם')
    expect(normalizeTitle('שיעור ניווט:')).toBe('שיעור ניווט')
  })
})
