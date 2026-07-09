import { clsx } from 'clsx'

export interface TabItem {
  key: string
  label: string
  badge?: number
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
}

export function Tabs({ items, active, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-1 rounded-xl bg-neutral-block p-1">
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          type="button"
          aria-selected={active === item.key}
          onClick={() => onChange(item.key)}
          className={clsx(
            'focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            active === item.key
              ? 'bg-panel-solid text-ink shadow-sm'
              : 'text-ink-muted hover:text-ink'
          )}
        >
          {item.label}
          {item.badge != null && item.badge > 0 ? (
            <span className="rounded-full bg-primary-soft px-1.5 text-xs font-semibold text-primary-hover">
              {item.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
