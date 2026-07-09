import * as XLSX from 'xlsx'
import type { ExcelParsedBlock, ExcelParsedSchedule } from '@/types'

// Expected format: first column = times ("08:00", 15-minute rows), then up to
// 7 day columns headed ראשון..שבת. Consecutive identical cells (or merged
// cells) become one block. Cell colors are ignored in v1.

const DAY_HEADERS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/

function normalizeCell(value: unknown): string {
  if (value == null) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

function asTime(value: unknown): string | null {
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  }
  if (typeof value === 'number') {
    // Excel time fraction of a day.
    const totalMinutes = Math.round(value * 24 * 60)
    const h = Math.floor(totalMinutes / 60) % 24
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const text = normalizeCell(value)
  return TIME_RE.test(text) ? text.padStart(5, '0') : null
}

export function parseExcelSchedule(data: ArrayBuffer, fileName: string): ExcelParsedSchedule {
  const warnings: string[] = []
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { fileName, dayHeaders: [], blocks: [], warnings: ['הקובץ ריק — לא נמצא גיליון.'] }
  }
  const sheet = workbook.Sheets[sheetName]

  // Fill merged ranges with the top-right (start) cell value — best effort.
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  for (const merge of sheet['!merges'] ?? []) {
    const source = grid[merge.s.r]?.[merge.s.c]
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (!grid[r]) grid[r] = []
        if (normalizeCell(grid[r][c]) === '') grid[r][c] = source
      }
    }
  }

  if (grid.length < 2) {
    return { fileName, dayHeaders: [], blocks: [], warnings: ['הגיליון ריק או קצר מדי.'] }
  }

  // Header row: locate day columns by Hebrew day names.
  const headerRow = grid[0].map(normalizeCell)
  const dayColumns: { col: number; dayIndex: number }[] = []
  headerRow.forEach((header, col) => {
    const dayIndex = DAY_HEADERS.findIndex((d) => header.includes(d))
    if (dayIndex >= 0) dayColumns.push({ col, dayIndex })
  })
  if (dayColumns.length === 0) {
    // Fallback: assume columns 1..7 are Sunday..Saturday.
    warnings.push('לא זוהו כותרות ימים — הופעלה הנחת ברירת מחדל (ראשון עד שבת).')
    for (let c = 1; c <= 7 && c < headerRow.length; c++) dayColumns.push({ col: c, dayIndex: c - 1 })
  }

  // Time rows.
  const timeRows: { row: number; time: string }[] = []
  for (let r = 1; r < grid.length; r++) {
    const time = asTime(grid[r]?.[0])
    if (time) timeRows.push({ row: r, time })
  }
  if (timeRows.length === 0) {
    warnings.push('לא זוהו שורות שעות בעמודה הראשונה.')
    return { fileName, dayHeaders: headerRow, blocks: [], warnings }
  }

  // Slot duration from consecutive time rows (default 15 minutes).
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  const slot =
    timeRows.length > 1 ? Math.max(5, toMin(timeRows[1].time) - toMin(timeRows[0].time)) : 15

  // Coalesce consecutive identical cells per day column into blocks.
  const blocks: ExcelParsedBlock[] = []
  for (const { col, dayIndex } of dayColumns) {
    let current: { title: string; start: string; end: string } | null = null
    for (const { row, time } of timeRows) {
      const title = normalizeCell(grid[row]?.[col])
      const slotEnd = minToTime(toMin(time) + slot)
      if (current && title === current.title && title !== '') {
        current.end = slotEnd
        continue
      }
      if (current && current.title !== '') {
        blocks.push({ dayIndex, startTime: current.start, endTime: current.end, title: current.title })
      }
      current = title === '' ? null : { title, start: time, end: slotEnd }
    }
    if (current && current.title !== '') {
      blocks.push({ dayIndex, startTime: current.start, endTime: current.end, title: current.title })
    }
  }

  return { fileName, dayHeaders: headerRow, blocks, warnings }
}

function minToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
