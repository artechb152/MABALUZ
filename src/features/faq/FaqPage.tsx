import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/assets/icons/Icon'
import { nav } from '@/lib/hebrewCopy'
import { useDb } from '@/app/dbStore'
import { clsx } from 'clsx'

export function FaqPage() {
  const faq = useDb((s) => s.faq)
  const [openId, setOpenId] = useState<string | null>(faq[0]?.id ?? null)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={nav.faq} />
      <div className="space-y-2">
        {[...faq]
          .sort((a, b) => a.order - b.order)
          .map((item) => {
            const open = openId === item.id
            return (
              <div key={item.id} className={clsx('glass-solid overflow-hidden transition-shadow', open && 'shadow-card-hover')}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="focus-ring flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
                >
                  <span className="text-base font-semibold text-ink">{item.question}</span>
                  <Icon
                    name={open ? 'chevron-left' : 'chevron-right'}
                    size={16}
                    className={clsx('shrink-0 transition-transform', open ? '-rotate-90 text-primary' : 'text-ink-muted')}
                  />
                </button>
                {open ? (
                  <div className="border-t border-line px-5 py-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{item.answer}</p>
                  </div>
                ) : null}
              </div>
            )
          })}
      </div>
    </div>
  )
}
