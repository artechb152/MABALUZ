import { clsx } from 'clsx'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'focus-ring inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      <span
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-line'
        )}
      >
        <span
          className={clsx(
            'absolute h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'end-0.5' : 'start-0.5'
          )}
        />
      </span>
      {label ? <span className="text-sm text-ink">{label}</span> : null}
    </button>
  )
}
