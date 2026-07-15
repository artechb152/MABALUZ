import { clsx } from 'clsx'

interface WordmarkProps {
  /** Visual size of the wordmark. `nav` fills the sidebar-column width. */
  size?: 'sm' | 'md' | 'nav' | 'lg' | 'xl'
  className?: string
}

const sizeClasses: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'text-[20px]',
  md: 'text-[26px]',
  nav: 'text-[34px]',
  lg: 'text-[34px]',
  xl: 'text-[52px]'
}

// The product wordmark. Cherry Bomb One is distinctive enough to be the logo on
// its own — no icon box. Latin "MABALUZ" is the brand mark (an allowed
// exception to the Hebrew-only UI rule).
export function Wordmark({ size = 'md', className }: WordmarkProps) {
  return (
    <span
      className={clsx('font-brand leading-none tracking-wide text-ink', sizeClasses[size], className)}
      aria-label="MABALUZ"
    >
      MABALUZ
    </span>
  )
}
