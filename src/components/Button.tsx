import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from '@/assets/icons/Icon'

type Variant = 'primary' | 'publish' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Shows a spinner and disables the button (for async/non-instant actions). */
  loading?: boolean
  children: ReactNode
}

// Non-signature variants: recolored to the monochrome + indigo palette. Status
// colors (danger/success) appear as thin text+border accents, never as fills.
const variantClasses: Record<Exclude<Variant, 'primary' | 'publish'>, string> = {
  secondary: 'bg-primary-soft text-primary-hover hover:bg-primary-soft/70 border border-primary/25',
  ghost: 'bg-transparent text-ink hover:bg-neutral-block',
  danger: 'bg-transparent text-danger border border-danger/40 hover:bg-danger/5',
  success: 'bg-transparent text-success border border-success/40 hover:bg-success/5'
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-detail',
  md: 'h-10 px-4 text-body',
  lg: 'h-12 px-6 text-body'
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  if (variant === 'publish') {
    return (
      <button
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={clsx('btn-base btn-publish font-bold', sizeClasses[size], className)}
        {...rest}
      >
        {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
        <span className="btn-publish-label">{children}</span>
        <span className="btn-publish-arrow" aria-hidden="true">
          <Icon name="publish" size={18} />
        </span>
      </button>
    )
  }

  if (variant === 'primary') {
    // Content is wrapped so it sits above the graphite ::before wipe overlay
    // (bare text nodes would otherwise be painted under it).
    return (
      <button
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={clsx('btn-base btn-action', sizeClasses[size], className)}
        {...rest}
      >
        <span className="relative z-10 inline-flex items-center gap-2">
          {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
          {children}
        </span>
      </button>
    )
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={clsx(
        'btn-base transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}
