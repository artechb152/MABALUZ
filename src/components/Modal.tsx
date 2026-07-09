import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { Button } from './Button'
import { buttons } from '@/lib/hebrewCopy'
import { Icon } from '@/assets/icons/Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  size?: 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
}

const sizeClasses = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export function Modal({ open, onClose, title, subtitle, size = 'lg', children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={clsx(
          'glass-solid flex max-h-[88vh] w-full flex-col overflow-hidden shadow-pop',
          sizeClasses[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={buttons.close}>
            <Icon name="close" size={16} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-start gap-2 border-t border-line px-6 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
