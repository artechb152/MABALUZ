import { clsx } from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  solid?: boolean
  children: ReactNode
}

export function Card({ solid = false, className, children, ...rest }: CardProps) {
  return (
    <div className={clsx(solid ? 'glass-solid' : 'card-tex', 'p-5', className)} {...rest}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function CardTitle({ title, subtitle, action }: CardTitleProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
