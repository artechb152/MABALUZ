import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  action?: ReactNode
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-panel-solid/60 px-6 py-12 text-center">
      <div className="h-10 w-10 rounded-xl bg-primary-soft" aria-hidden="true" />
      <p className="max-w-sm text-sm text-ink-muted">{message}</p>
      {action}
    </div>
  )
}
