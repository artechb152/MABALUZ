import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Icon, type IconName } from '@/assets/icons/Icon'

// Animated dropdowns (adapted from the provided dropdown-01 reference):
// border-2 trigger, rotating chevron, fade/slide menu, staggered options,
// invert-on-hover rows, spring check mark. Colors and proportions follow the
// app palette (ink on cream, indigo accent).

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])
  return ref
}

const menuMotion = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 }
} as const

const itemMotion = (index: number) =>
  ({
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.2, delay: index * 0.05 }
  }) as const

export interface SelectOption {
  id: string
  label: string
  description?: string
}

interface AnimatedSelectProps {
  options: SelectOption[]
  value: string | null
  onChange: (id: string) => void
  placeholder?: string
  className?: string
}

/** Select-style dropdown (used in the register form). */
export function AnimatedSelect({ options, value, onChange, placeholder, className }: AnimatedSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClose(() => setOpen(false))
  const selected = options.find((o) => o.id === value) ?? null

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="t-body flex w-full items-center justify-between gap-2 rounded-xl border-2 border-ink bg-panel-solid px-3.5 py-2.5 font-medium text-ink transition-colors duration-300 hover:bg-ink hover:text-background"
      >
        <span className={clsx(!selected && 'font-normal opacity-60')}>{selected?.label ?? placeholder ?? ''}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }} className="flex">
          <Icon name="chevron-down" size={18} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            {...menuMotion}
            role="listbox"
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border-2 border-ink bg-panel-solid shadow-pop"
          >
            {options.map((option, index) => (
              <motion.button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.id === value}
                {...itemMotion(index)}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className={clsx(
                  'group flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-start transition-colors duration-200 hover:bg-ink hover:text-background',
                  index !== options.length - 1 && 'border-b border-line/60',
                  option.id === value ? 'text-ink' : 'text-ink'
                )}
              >
                <span>
                  <span className="t-body block font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="t-detail block text-ink-muted transition-colors group-hover:text-stone">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {option.id === value ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="flex text-primary group-hover:text-background"
                  >
                    <Icon name="check" size={18} />
                  </motion.span>
                ) : null}
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export interface MenuItem {
  id: string
  label: string
  icon: IconName
  danger?: boolean
  onSelect: () => void
}

interface AnimatedMenuProps {
  /** Custom trigger; receives open state (e.g. to rotate its own chevron). */
  trigger: (open: boolean) => ReactNode
  items: MenuItem[]
  /** Menu width in px (defaults to 230). Ignored when matchTriggerWidth is set. */
  width?: number
  /** Make the menu exactly as wide as its trigger. */
  matchTriggerWidth?: boolean
  className?: string
}

/** Menu-style dropdown with a custom trigger (used for the navbar user chip). */
export function AnimatedMenu({ trigger, items, width = 230, matchTriggerWidth, className }: AnimatedMenuProps) {
  const [open, setOpen] = useState(false)
  const [triggerWidth, setTriggerWidth] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const ref = useOutsideClose(() => setOpen(false))

  function toggle() {
    if (matchTriggerWidth && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
    setOpen((v) => !v)
  }

  return (
    <div ref={ref} className={clsx('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring block rounded-xl"
      >
        {trigger(open)}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            {...menuMotion}
            role="menu"
            style={{ width: matchTriggerWidth ? (triggerWidth ?? width) : width }}
            className="absolute start-0 top-full z-[60] mt-2 overflow-hidden rounded-xl border border-line bg-panel-solid shadow-pop"
          >
            {items.map((item, index) => (
              <motion.button
                key={item.id}
                type="button"
                role="menuitem"
                {...itemMotion(index)}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className={clsx(
                  'group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start transition-colors duration-200',
                  index !== items.length - 1 && 'border-b border-line/60',
                  item.danger
                    ? 'text-danger hover:bg-danger hover:text-background'
                    : 'text-ink hover:bg-ink hover:text-background'
                )}
              >
                <Icon name={item.icon} size={17} className="shrink-0 opacity-80" />
                <span className="t-body font-medium">{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
