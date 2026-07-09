// Generates fake previous-training schedules in the expected Excel format:
// first column = times (15-minute rows), 7 day columns (ראשון..שבת), Hebrew
// cells, a few merged cells for realism. Run: npm run generate:sample-excel
import * as XLSX from 'xlsx'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = join(__dirname, '..', 'public', 'sample-excel')

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function times(): string[] {
  const list: string[] = []
  for (let m = 8 * 60; m < 20 * 60; m += 15) {
    list.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return list
}

interface Block {
  day: number // 0=Sunday
  start: string
  end: string
  title: string
}

function fillBlocks(blocks: Block[]): string[][] {
  const rows = times()
  const grid: string[][] = rows.map((t) => [t, ...Array<string>(7).fill('')])
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))
  for (const b of blocks) {
    for (let m = toMin(b.start); m < toMin(b.end); m += 15) {
      const rowIndex = (m - 8 * 60) / 15
      if (rowIndex >= 0 && rowIndex < rows.length) grid[rowIndex][b.day + 1] = b.title
    }
  }
  return [['שעה', ...DAYS], ...grid]
}

function weekdayBlocks(day: number, lessons: string[], evening: string): Block[] {
  return [
    { day, start: '08:00', end: '08:15', title: 'מסדר בוקר' },
    { day, start: '08:15', end: '10:00', title: lessons[0] },
    { day, start: '10:15', end: '12:00', title: lessons[1] },
    { day, start: '12:00', end: '13:00', title: 'ארוחת צהריים והפסקה' },
    { day, start: '13:00', end: '15:00', title: lessons[2] },
    { day, start: '15:15', end: '17:00', title: lessons[3] },
    { day, start: '18:00', end: '19:00', title: 'ארוחת ערב והפסקה' },
    { day, start: '19:00', end: '20:00', title: evening }
  ]
}

function buildSample(variant: 1 | 2): string[][] {
  const lessons = [
    'מבוא לעבודה מודיעינית',
    'ניתוח מידע ומקורות',
    'כתיבה מודיעינית',
    'מפות והתמצאות',
    'תרגול צוותי',
    'תרגול מסכם'
  ]
  const blocks: Block[] = []
  for (let day = 0; day <= 4; day++) {
    const rotated = [...lessons.slice(day % lessons.length), ...lessons.slice(0, day % lessons.length)]
    blocks.push(...weekdayBlocks(day, rotated, day % 3 === 0 ? 'זמן מפקד' : 'פעילות צוותית'))
  }
  // Friday short day.
  blocks.push(
    { day: 5, start: '08:00', end: '08:15', title: 'מסדר בוקר' },
    { day: 5, start: '08:15', end: '11:00', title: 'תרגול מסכם' },
    { day: 5, start: '11:00', end: '13:00', title: 'סיכום שבוע ופעילות צוותית' }
  )
  // Guest lectures — different placement per variant so the learner averages them.
  if (variant === 1) {
    blocks.push({ day: 1, start: '13:00', end: '14:30', title: 'הרצאת חוץ: מבוא לעבודה מודיעינית' })
    blocks.push({ day: 3, start: '15:15', end: '16:45', title: 'הרצאת חוץ: ניתוח אירועים' })
  } else {
    blocks.push({ day: 2, start: '13:00', end: '14:30', title: 'הרצאת חוץ: מיומנויות הדרכה' })
    // One-off item that should get LOW confidence.
    blocks.push({ day: 4, start: '15:15', end: '17:00', title: 'סדנת צילום' })
  }
  return fillBlocks(blocks)
}

function writeWorkbook(rows: string[][], fileName: string, withMerges: boolean): void {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  if (withMerges) {
    // Simulate real-world merged cells: merge the first lesson block of Sunday
    // (rows 2..8 in column B — 08:15-10:00) into one cell.
    sheet['!merges'] = [{ s: { r: 2, c: 1 }, e: { r: 8, c: 1 } }]
    for (let r = 3; r <= 8; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 1 })
      delete sheet[addr]
    }
  }
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'לוז שבועי')
  XLSX.writeFile(workbook, join(OUT_DIR, fileName))
  console.log('created:', fileName)
}

mkdirSync(OUT_DIR, { recursive: true })
writeWorkbook(buildSample(1), 'mahzor-22.xlsx', true)
writeWorkbook(buildSample(2), 'mahzor-23.xlsx', false)
writeWorkbook([['שעה', ...DAYS], ...times().map((t) => [t, ...Array<string>(7).fill('')])], 'empty-template.xlsx', false)
console.log('done. output dir:', OUT_DIR)
