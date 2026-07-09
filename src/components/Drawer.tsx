import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { buttons } from '@/lib/hebrewCopy'
import { Icon } from '@/assets/icons/Icon'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Side panel sliding in from the left edge (RTL layout: content sits right). */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
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
      className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="absolute left-0 top-0 flex h-full w-full max-w-md flex-col border-e border-line bg-panel-solid shadow-pop"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={buttons.close}>
            <Icon name="close" size={16} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}
