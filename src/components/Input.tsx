import { clsx } from 'clsx'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react'

// Body-size text + a soft focus animation: the border darkens, an indigo halo
// eases in, and the field lifts a hair.
const baseFieldClasses =
  'w-full rounded-xl border border-line bg-panel-solid px-3.5 py-2.5 text-body text-ink placeholder:text-ink-muted/50 outline-none transition-all duration-200 ease-out focus:-translate-y-px focus:border-primary focus:shadow-[0_0_0_4px_rgba(79,70,229,0.13)] disabled:cursor-not-allowed disabled:bg-neutral-block'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(baseFieldClasses, className)} {...rest} />
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(baseFieldClasses, 'min-h-20', className)} {...rest} />
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(baseFieldClasses, className)} {...rest}>
      {children}
    </select>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ label, required, hint, error, children, className }: FieldProps) {
  return (
    <label className={clsx('block', className)}>
      <span className="t-body mb-1.5 flex items-center gap-1 font-medium text-ink">
        {label}
        {required ? <span className="text-danger">*</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="t-detail mt-1 block text-ink-muted">{hint}</span> : null}
      {error ? <span className="t-detail mt-1 block text-danger">{error}</span> : null}
    </label>
  )
}
