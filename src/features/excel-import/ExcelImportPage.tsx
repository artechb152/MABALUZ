import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ExcelParsedSchedule, ImportedTrainingTemplate } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Icon } from '@/assets/icons/Icon'
import { clsx } from 'clsx'
import { aiPlaceholder, emptyStates, importScreen, nav } from '@/lib/hebrewCopy'
import { useSelectedTraining } from '@/app/hooks'
import { saveImportedTemplate } from '@/data/services/importService'
import { parseExcelSchedule } from './parser'
import { learnFromParsedSchedules } from './learn'
import { ReviewTable } from './ReviewTable'
import { importCopy } from './copy'

const SAMPLE_FILES = ['mahzor-22.xlsx', 'mahzor-23.xlsx']

export function ExcelImportPage() {
  const navigate = useNavigate()
  const training = useSelectedTraining()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ExcelParsedSchedule[]>([])
  const [template, setTemplate] = useState<ImportedTrainingTemplate | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.excelImport} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  async function ingest(buffers: { name: string; data: ArrayBuffer }[]) {
    if (!training) return
    setParsing(true)
    setError(null)
    setSaved(false)
    try {
      const results = buffers.map((b) => parseExcelSchedule(b.data, b.name))
      const merged = [...parsed, ...results]
      setParsed(merged)
      setTemplate(learnFromParsedSchedules(merged, training.id))
    } catch (e) {
      setError(importCopy.parseError + (e instanceof Error ? ` (${e.message})` : ''))
    } finally {
      setParsing(false)
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const buffers = await Promise.all(
      [...files]
        .filter((f) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
        .map(async (f) => ({ name: f.name, data: await f.arrayBuffer() }))
    )
    if (buffers.length > 0) await ingest(buffers)
  }

  async function loadSamples() {
    const buffers = await Promise.all(
      SAMPLE_FILES.map(async (name) => {
        const res = await fetch(`./sample-excel/${name}`)
        if (!res.ok) throw new Error(name)
        return { name, data: await res.arrayBuffer() }
      })
    )
    await ingest(buffers)
  }

  async function handleSave() {
    if (!template) return
    await saveImportedTemplate(template)
    setSaved(true)
  }

  return (
    <div>
      <PageHeader title={nav.excelImport} subtitle={training.name} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Upload zone */}
          <div
            className={clsx(
              'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              dragOver ? 'border-primary bg-primary-soft/60' : 'border-line bg-panel-solid/60'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              void handleFiles(e.dataTransfer.files)
            }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Icon name="excel-import" size={22} />
            </span>
            <p className="text-sm text-ink">{importScreen.dropHere}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                {importCopy.chooseFile}
              </Button>
              <Button variant="ghost" size="sm" loading={parsing} onClick={() => void loadSamples()}>
                {importScreen.useSample}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {parsing ? <p className="text-xs text-ink-muted">{importScreen.parsing}</p> : null}
            {error ? <p className="text-xs text-danger">{error}</p> : null}
          </div>

          {/* Parsed files summary */}
          {parsed.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {parsed.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-panel-solid px-3 py-1.5 text-xs">
                  <Icon name="excel-import" size={13} className="text-success" />
                  <span className="font-medium text-ink">{p.fileName}</span>
                  <span className="tnum text-ink-muted">{importCopy.blocksFound(p.blocks.length)}</span>
                  {p.warnings.length > 0 ? (
                    <Badge tone="warning">{importCopy.warningsCount(p.warnings.length)}</Badge>
                  ) : null}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsed([])
                  setTemplate(null)
                  setSaved(false)
                }}
              >
                {importCopy.clearAll}
              </Button>
            </div>
          ) : null}
        </div>

        {/* Locked AI card */}
        <div className="card-tex p-5 opacity-90">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-block text-ink-muted">
              <Icon name="lock" size={17} />
            </span>
            <h2 className="text-sm font-semibold text-ink">{aiPlaceholder.title}</h2>
          </div>
          <p className="whitespace-pre-line text-sm text-ink-muted">{aiPlaceholder.body}</p>
        </div>
      </div>

      {/* Review */}
      {template ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">{importScreen.title}</h2>
            <div className="flex items-center gap-2">
              {saved ? (
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <Icon name="success" size={15} />
                  {importCopy.savedNote}
                  <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')}>
                    {importCopy.goGenerate}
                  </Button>
                </span>
              ) : null}
              <Button onClick={() => void handleSave()}>{importCopy.saveTemplate}</Button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
            <span className="tnum">
              {importCopy.avgGuestMinutes(template.averageGuestLectureMinutesPerTraining)}
            </span>
            {template.typicalLunchStart ? (
              <span className="tnum">{importCopy.lunchAt(template.typicalLunchStart)}</span>
            ) : null}
            {template.typicalDinnerStart ? (
              <span className="tnum">{importCopy.dinnerAt(template.typicalDinnerStart)}</span>
            ) : null}
          </div>
          <ReviewTable
            template={template}
            onChange={(t) => {
              setTemplate(t)
              setSaved(false)
            }}
          />
        </div>
      ) : parsed.length === 0 ? (
        <div className="mt-6">
          <EmptyState message={emptyStates.importToStart} />
        </div>
      ) : null}
    </div>
  )
}
