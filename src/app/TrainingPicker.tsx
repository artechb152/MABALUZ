import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Icon } from '@/assets/icons/Icon'
import { buttons, dashboards, emptyStates } from '@/lib/hebrewCopy'
import { formatDateHe } from '@/lib/time'
import { useMyTrainings, useSelectedTraining } from './hooks'
import { useUi } from './uiStore'

/**
 * Navbar "current training" picker — a dropdown styled like the user menu, with
 * a search box to filter trainings by name. Its trigger's right edge sits at the
 * content column's right edge (aligned with the dashboard greeting).
 */
export function TrainingPicker() {
  const myTrainings = useMyTrainings()
  const selected = useSelectedTraining()
  const setSelected = useUi((s) => s.setSelectedTraining)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim()
    return q ? myTrainings.filter((t) => t.name.includes(q)) : myTrainings
  }, [myTrainings, query])

  if (myTrainings.length === 0 || !selected) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setQuery('')
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          'focus-ring flex items-center gap-3 rounded-xl border border-line bg-panel-solid px-4 py-1.5 shadow-sm transition-colors',
          open ? 'bg-neutral-block/70' : 'hover:bg-neutral-block/60'
        )}
      >
        <span className="min-w-0 text-start leading-tight">
          <span className="block text-[12px] font-medium text-ink-muted">{dashboards.currentTraining}</span>
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[16px] font-semibold text-ink">{selected.name}</span>
            <span dir="ltr" className="tnum shrink-0 text-[13px] font-light text-ink-muted">
              {formatDateHe(selected.startDate)} — {formatDateHe(selected.endDate)}
            </span>
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={18}
          className={clsx('shrink-0 text-ink transition-transform duration-300', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            role="listbox"
            className="absolute end-0 top-full z-[60] mt-2 w-[340px] overflow-hidden rounded-xl border border-line bg-panel-solid shadow-pop"
          >
            <div className="border-b border-line p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={buttons.search}
                className="focus-ring w-full rounded-lg border border-line bg-background/60 px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-muted/60 focus:border-primary/40"
              />
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-[14px] text-ink-muted">{emptyStates.noResults}</p>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="option"
                    aria-selected={t.id === selected.id}
                    onClick={() => {
                      setSelected(t.id)
                      setOpen(false)
                    }}
                    className={clsx(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start transition-colors hover:bg-primary-soft/50',
                      t.id === selected.id && 'bg-primary-soft/40'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium text-ink">{t.name}</span>
                      <span dir="ltr" className="tnum block text-[12px] text-ink-muted">
                        {formatDateHe(t.startDate)} — {formatDateHe(t.endDate)}
                      </span>
                    </span>
                    {t.id === selected.id ? <Icon name="check" size={16} className="shrink-0 text-primary" /> : null}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
