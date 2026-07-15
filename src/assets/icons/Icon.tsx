import type { ReactNode, SVGProps } from 'react'

// Placeholder geometric icons (see ICONS_REQUIRED.md). Custom icons will be
// dropped in later; keep the `name` keys stable. currentColor strokes only.
export type IconName =
  | 'dashboard'
  | 'training'
  | 'calendar'
  | 'shared-schedule'
  | 'peak-day'
  | 'guest-lecturer'
  | 'excel-import'
  | 'conflict'
  | 'lock'
  | 'unlock'
  | 'publish'
  | 'draft'
  | 'notification'
  | 'message-center'
  | 'admin'
  | 'settings'
  | 'faq'
  | 'contact'
  | 'warning'
  | 'success'
  | 'soldier'
  | 'commander'
  | 'senior-commander'
  | 'close'
  | 'search'
  | 'plus'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'check'
  | 'clock'
  | 'location'
  | 'phone'
  | 'mail'
  | 'undo'
  | 'history'
  | 'eye'
  | 'eye-off'
  | 'link'
  | 'drag'
  | 'print'
  | 'display'
  | 'users'
  | 'trash'
  | 'edit'
  | 'prayers'

const shapes: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </>
  ),
  training: (
    <>
      <path d="M12 4 21 8.5 12 13 3 8.5Z" />
      <path d="M7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  'shared-schedule': (
    <>
      <rect x="3" y="5" width="13" height="13" rx="2" />
      <rect x="8" y="9" width="13" height="10" rx="2" />
    </>
  ),
  'peak-day': (
    <>
      <path d="M3 19 9 8l4 6 3-4 5 9Z" />
      <path d="M3 19h18" />
    </>
  ),
  'guest-lecturer': (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M4 20c0-3 2.2-5 5-5s5 2 5 5" />
      <path d="M16 4h5M16 8h5M18 12h3" />
    </>
  ),
  'excel-import': (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M12 8v8M8.5 12.5 12 16l3.5-3.5" />
    </>
  ),
  conflict: (
    <>
      <path d="M12 3 22 20H2Z" />
      <path d="M12 9v5M12 17.2v.3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.7-1.5" />
    </>
  ),
  publish: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
  draft: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeDasharray="2.5 2" />
    </>
  ),
  notification: (
    <>
      <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2.5H4.5Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  'message-center': (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3 20 6v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  faq: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5A2.5 2.5 0 0 1 14.5 10c0 1.5-2.5 2-2.5 3.5M12 17v.3" />
    </>
  ),
  contact: (
    <>
      <path d="M5 4h4l1.5 4L8 10a12 12 0 0 0 6 6l2-2.5 4 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </>
  ),
  warning: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.2v.3" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" />
    </>
  ),
  soldier: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    </>
  ),
  commander: (
    <>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 20c0-3.2 3-5.5 7-5.5s7 2.3 7 5.5" />
      <path d="m9.5 12.5 2.5 2 2.5-2" />
    </>
  ),
  'senior-commander': (
    <>
      <circle cx="12" cy="6.5" r="3" />
      <path d="M5 20c0-3.2 3-5.5 7-5.5s7 2.3 7 5.5" />
      <path d="m9.5 11 2.5 2 2.5-2M9.5 14l2.5 2 2.5-2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'chevron-right': <path d="m9.5 5 7 7-7 7" />,
  'chevron-left': <path d="m14.5 5-7 7 7 7" />,
  'chevron-down': <path d="m5 9.5 7 7 7-7" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  location: (
    <>
      <path d="M12 21c-4-4.2-7-7.2-7-10.5a7 7 0 0 1 14 0C19 13.8 16 16.8 12 21Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </>
  ),
  phone: (
    <>
      <path d="M5 4h4l1.5 4L8 10a12 12 0 0 0 6 6l2-2.5 4 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  undo: (
    <>
      <path d="M8 6 4 10l4 4" />
      <path d="M4 10h10a6 6 0 0 1 0 12h-4" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l3 2M5 4v4h4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <path d="M4 20 20 4" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.24 4.24 0 0 0-6-6l-1.5 1.5" />
      <path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.24 4.24 0 0 0 6 6l1.5-1.5" />
    </>
  ),
  drag: (
    <>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </>
  ),
  print: (
    <>
      <path d="M7 8V3h10v5" />
      <rect x="4" y="8" width="16" height="9" rx="2" />
      <rect x="7" y="14" width="10" height="7" />
    </>
  ),
  display: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M16 5a3.5 3.5 0 0 1 0 6.5M17 15c2.5.5 4 2.2 4 5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14" />
    </>
  ),
  edit: (
    <>
      <path d="m15 5 4 4L8.5 19.5 4 20l.5-4.5Z" />
    </>
  ),
  prayers: (
    <>
      <path d="M12 5.5C10 4 6.5 4 4.5 5.2v13C6.5 17 10 17 12 18.5c2-1.5 5.5-1.5 7.5-.3v-13C17.5 4 14 4 12 5.5Z" />
      <path d="M12 5.5v13" />
    </>
  )
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {shapes[name]}
    </svg>
  )
}
