import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

// Neutral + primary may use a calm soft fill (stone / indigo — both app palette).
// Status tones (success/warning/danger) reuse the rich colors but ONLY as a thin
// border + text accent, never as a filled panel.
const toneClasses: Record<Tone, string> = {
  neutral: 'bg-neutral-block text-ink-muted border border-transparent',
  primary: 'bg-primary-soft text-primary-hover border border-transparent',
  success: 'bg-transparent text-success border border-success/45',
  warning: 'bg-transparent text-warning border border-warning/45',
  danger: 'bg-transparent text-danger border border-danger/45'
}

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-detail font-medium',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
