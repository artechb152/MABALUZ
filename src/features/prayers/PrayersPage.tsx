import { useMemo, useState, type CSSProperties } from 'react'
import { clsx } from 'clsx'
import { parseISO } from 'date-fns'
import { Icon } from '@/assets/icons/Icon'
import { dayNames, generic, prayersCopy } from '@/lib/hebrewCopy'
import { addDaysISO, formatDateHe, todayISO, weekStartISO } from '@/lib/time'
import { hebDayInfo, hebrewDateShort } from '@/lib/hebcalendar'
import { blockTextColor } from '@/lib/theme'
import prayerPhoto from '@/assets/images/prayer-sunset.jpg'
import { prayersForDate, weekPrayerContext, type PrayerSlot } from './prayerSchedule'

/** One prayer: a full-height colour panel, rounded on its left, tucked under
    the panel to its right so each one "comes out" from beneath the previous. */
function PrayerPanel({ slot, index, count }: { slot: PrayerSlot; index: number; count: number }) {
  const fg = blockTextColor(slot.color)
  const style: CSSProperties = {
    backgroundColor: slot.color,
    color: fg,
    zIndex: count - index,
    marginInlineStart: index === 0 ? 0 : -16
  }
  return (
    <div
      className={clsx(
        'relative flex flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-e-2xl px-2 shadow-md',
        // The first block closes the sequence on its right with rounded white edges.
        index === 0 && 'rounded-s-2xl'
      )}
      style={style}
    >
      <span className="relative z-10 text-[21px] font-semibold leading-tight">{slot.name}</span>
      <span dir="ltr" className="relative z-10 tnum text-[18px] font-normal leading-none">
        {slot.start}–{slot.end}
      </span>
    </div>
  )
}

function SpecialTag({ date }: { date: string }) {
  const special = hebDayInfo(date)
  if (!special) return null
  return (
    <span
      className={clsx(
        'shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-medium',
        special.kind === 'fast'
          ? 'bg-danger-soft text-danger'
          : special.kind === 'holiday' || special.kind === 'cholhamoed'
            ? 'bg-primary-soft text-primary-hover'
            : 'bg-neutral-block text-ink-muted'
      )}
    >
      {special.label}
    </span>
  )
}

function DayRow({ date, today }: { date: string; today: string }) {
  const slots = prayersForDate(date)
  const dow = parseISO(date).getDay()
  const isToday = date === today
  return (
    <div
      className={clsx(
        'flex min-h-[68px] flex-1 items-stretch overflow-hidden rounded-2xl border bg-panel-solid shadow-card',
        isToday ? 'border-primary/40 ring-1 ring-primary/30' : 'border-line'
      )}
    >
      {/* White label sits ABOVE the colour blocks (own white fill + left shadow);
          the first prayer panel tucks under it. Day name → Hebrew date → tag,
          Gregorian date beneath. */}
      <div className="relative z-20 flex w-[250px] shrink-0 flex-col justify-center gap-1 rounded-2xl bg-panel-solid px-5 shadow-[-9px_0_16px_-6px_rgba(0,0,0,0.16)]">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-semibold text-ink">{dayNames[dow]}</span>
          <span className="text-[16px] font-light text-ink-muted">{hebrewDateShort(date)}</span>
          <SpecialTag date={date} />
        </div>
        <span className="tnum text-[15px] font-light text-ink-muted">{formatDateHe(date)}</span>
      </div>

      {slots.length > 0 ? (
        <div className="relative z-10 flex flex-1 items-stretch" style={{ marginInlineStart: -18 }}>
          {slots.map((s, i) => (
            <PrayerPanel key={`${s.key}-${i}`} slot={s} index={i} count={slots.length} />
          ))}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4">
          <span className="text-[15px] font-light text-ink-muted">{prayersCopy.noPrayersShabbat}</span>
        </div>
      )}
    </div>
  )
}

export function PrayersPage() {
  const today = todayISO()
  const [weekStart, setWeekStart] = useState(() => weekStartISO(today))

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)), [weekStart])
  const ctx = useMemo(() => weekPrayerContext(days), [days])

  return (
    // Fills the viewport: the page itself never scrolls; the rows flex to fit.
    <div className="flex h-full flex-col">
      <h1 className="t-display mb-3">
        {prayersCopy.title}
        <span className="font-light text-ink-muted"> - {prayersCopy.subtitle}</span>
      </h1>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Right (RTL first): the controls line, then the week's prayer rows. */}
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="week-nav-btn"
                onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
                aria-label="שבוע קודם"
              >
                <Icon name="chevron-right" size={16} />
              </button>
              <span className="tnum min-w-[150px] text-center text-[18px] font-normal text-ink-muted">
                {generic.week}: {formatDateHe(weekStart)}
              </span>
              <button
                type="button"
                className="week-nav-btn"
                onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
                aria-label="שבוע הבא"
              >
                <Icon name="chevron-left" size={16} />
              </button>
            </div>
            <span className="rounded-full bg-primary-soft px-3.5 py-1.5 text-[14px] font-medium text-primary-hover">
              {ctx.summer ? prayersCopy.summerClock : prayersCopy.winterClock}
            </span>
            {ctx.hasRoshChodesh ? (
              <span className="rounded-full bg-neutral-block px-3.5 py-1.5 text-[14px] font-medium text-ink-muted">
                {prayersCopy.roshChodeshNote}
              </span>
            ) : null}
            {ctx.isElul ? (
              <span className="rounded-full bg-neutral-block px-3.5 py-1.5 text-[14px] font-medium text-ink-muted">
                {prayersCopy.elulNote}
              </span>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {days.map((date) => (
              <DayRow key={date} date={date} today={today} />
            ))}
          </div>
        </div>

        {/* Left: a folder tab bulging from the card top (in the rosh-chodesh note's
            colour), then the photo filling the rest to the last prayer row. */}
        <div className="flex min-h-0 flex-col">
          {/* Folder tab — more tabs can be added here later. */}
          <div className="relative z-10 ps-4">
            <span className="inline-block rounded-t-xl bg-neutral-block px-5 py-3 text-[16px] font-semibold text-ink">
              {prayersCopy.instructionsTab}
            </span>
          </div>
          <section className="card-tex -mt-px p-6">
            <dl className="space-y-2.5">
              {prayersCopy.instructions.map((r) => (
                <div key={r.label} className="flex items-baseline gap-2">
                  <dt className="shrink-0 text-[18px] font-normal text-ink-muted">{r.label}</dt>
                  <span className="text-[18px] font-normal text-ink-muted">-</span>
                  <dd dir="auto" className="tnum text-[18px] font-light text-ink">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[15px] font-light text-ink-muted">{prayersCopy.clockNote}</p>
          </section>

          {/* flex-1 with an absolutely-filled image, so the photo fills the
              leftover height and its bottom lines up with the last prayer row. */}
          <figure className="relative mt-5 min-h-0 flex-1 overflow-hidden rounded-2xl border border-line shadow-card">
            <img
              src={prayerPhoto}
              alt={prayersCopy.photoAlt}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          </figure>
        </div>
      </div>
    </div>
  )
}
