import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Icon, type IconName } from '@/assets/icons/Icon'
import { Button } from '@/components/Button'
import { Wordmark } from '@/components/Wordmark'
import { Select } from '@/components/Input'
import { AnimatedMenu } from '@/components/AnimatedDropdown'
import { useSession } from './sessionStore'
import { useUi } from './uiStore'
import {
  useCurrentUser,
  useEffectiveRole,
  useMyNotifications,
  useMyTrainings,
  usePublishedSchedule,
  useSelectedTraining,
  useUnreadCount
} from './hooks'
import { markAllRead, markNotificationRead } from '@/data/services/notificationService'
import {
  buttons,
  dashboards,
  emptyStates,
  generic,
  nav,
  roleLabels,
  userMenu
} from '@/lib/hebrewCopy'
import { formatDateHe } from '@/lib/time'
import { soldierCopy } from '@/features/schedule/copy'
import artechLogo from '@/assets/images/artech-logo.svg'
import type { UserRole } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: IconName
  roles: UserRole[]
}

const ALL: UserRole[] = ['SOLDIER', 'TRAINING_COMMANDER', 'SENIOR_COMMANDER', 'ADMIN']
const COMMANDERS: UserRole[] = ['TRAINING_COMMANDER', 'SENIOR_COMMANDER', 'ADMIN']

const navItems: NavItem[] = [
  { to: '/dashboard', label: nav.dashboard, icon: 'dashboard', roles: ALL },
  { to: '/my-schedule', label: nav.mySchedule, icon: 'calendar', roles: ['SOLDIER'] },
  { to: '/prayers', label: nav.prayers, icon: 'prayers', roles: ALL },
  {
    to: '/trainings',
    label: nav.myTrainings,
    icon: 'training',
    roles: ['SENIOR_COMMANDER', 'ADMIN']
  },
  { to: '/schedule', label: nav.scheduleBuilder, icon: 'calendar', roles: COMMANDERS },
  { to: '/schedule/month', label: nav.monthlySchedule, icon: 'calendar', roles: COMMANDERS },
  { to: '/shared', label: nav.sharedSchedules, icon: 'shared-schedule', roles: COMMANDERS },
  { to: '/peak-days', label: nav.peakDays, icon: 'peak-day', roles: COMMANDERS },
  { to: '/lecturers', label: nav.guestLecturers, icon: 'guest-lecturer', roles: COMMANDERS },
  { to: '/import', label: nav.excelImport, icon: 'excel-import', roles: COMMANDERS },
  { to: '/conflicts', label: nav.conflictCenter, icon: 'conflict', roles: COMMANDERS },
  { to: '/versions', label: nav.versions, icon: 'history', roles: COMMANDERS },
  { to: '/messages', label: nav.messageCenter, icon: 'message-center', roles: COMMANDERS },
  { to: '/admin', label: nav.adminArea, icon: 'admin', roles: ['ADMIN'] },
  { to: '/settings', label: nav.settings, icon: 'settings', roles: COMMANDERS },
  // FAQ + contact are not shown to soldiers (no access).
  { to: '/faq', label: nav.faq, icon: 'faq', roles: COMMANDERS },
  { to: '/contact', label: nav.contact, icon: 'contact', roles: COMMANDERS }
]

function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const user = useCurrentUser()
  const notifications = useMyNotifications()
  const unread = useUnreadCount()

  return (
    <div className="relative">
      <button
        type="button"
        className="bell-button focus-ring"
        onClick={() => setOpen((v) => !v)}
        aria-label={dashboards.notifications}
      >
        <span className="bell-icon flex text-background">
          <Icon name="notification" size={18} />
        </span>
        {unread > 0 ? <span className="notif-badge">{unread}</span> : null}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-12 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-panel-solid shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="t-body font-semibold text-ink">{dashboards.notifications}</span>
              {user && notifications.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => void markAllRead(user)}>
                  {generic.markAllRead}
                </Button>
              ) : null}
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <p className="t-body px-3 py-6 text-center text-ink-muted">
                  {emptyStates.noNotifications}
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void markNotificationRead(n.id)}
                    className={clsx(
                      'block w-full rounded-xl px-3 py-2.5 text-right transition-colors hover:bg-primary-soft/50',
                      !n.readAt && 'bg-primary-soft/40'
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="t-body font-medium text-ink">{n.title}</span>
                      {!n.readAt ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                    </span>
                    {n.body ? <span className="t-detail mt-0.5 block text-ink-muted">{n.body}</span> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

/** Clickable user chip: name (20/600 graphite) over role (16 stone) + chevron. */
function UserMenu() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const signOut = useSession((s) => s.signOut)

  if (!user) return null

  return (
    <AnimatedMenu
      matchTriggerWidth
      className="-me-[10px]"
      items={[
        {
          id: 'profile',
          label: userMenu.viewProfile,
          icon: 'soldier',
          onSelect: () => navigate('/profile')
        },
        {
          id: 'swap',
          label: userMenu.swapAccount,
          icon: 'users',
          onSelect: () => navigate('/select-account')
        },
        {
          id: 'settings',
          label: userMenu.settings,
          icon: 'settings',
          onSelect: () => navigate('/user-settings')
        },
        {
          id: 'signout',
          label: userMenu.signOut,
          icon: 'close',
          danger: true,
          onSelect: () => {
            signOut()
            navigate('/')
          }
        }
      ]}
      trigger={(open) => (
        <span
          className={clsx(
            'flex items-center gap-3 rounded-xl border border-line bg-panel-solid px-3.5 py-1.5 shadow-sm transition-colors',
            open ? 'bg-neutral-block/70' : 'hover:bg-neutral-block/60'
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center text-ink-muted">
            <Icon name={roleIcon(user.role)} size={26} />
          </span>
          <span className="min-w-0 flex-1 text-start leading-tight">
            <span className="block truncate text-[18px] font-semibold text-ink">{user.displayName}</span>
            <span className="block truncate text-[17px] text-ink-muted">{roleLabels[user.role]}</span>
          </span>
          <Icon
            name="chevron-down"
            size={20}
            className={clsx('shrink-0 text-ink transition-transform duration-300', open && 'rotate-180')}
          />
        </span>
      )}
    />
  )
}

/** Indigo pop-up under the "הלו״ז שלי" nav item — pops in only while the
    My-Schedule tab is active, and pops back off when the user navigates away. */
function SidebarCommanderNote() {
  const location = useLocation()
  const training = useMyTrainings()[0] ?? null
  const published = usePublishedSchedule(training)
  const active = location.pathname.startsWith('/my-schedule')
  const note = published?.commanderNote

  return (
    <AnimatePresence initial={false}>
      {active && note ? (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -8, scale: 0.94 }}
          animate={{ opacity: 1, height: 'auto', y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, y: -8, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="overflow-hidden"
        >
          <div className="mx-1 mb-1 mt-1.5">
            <div className="relative rounded-xl border border-primary/30 bg-primary-soft px-3 py-2.5 shadow-card">
              <span className="absolute -top-1 end-6 h-2.5 w-2.5 rotate-45 border-s border-t border-primary/30 bg-primary-soft" />
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="t-detail font-medium text-primary-hover">{soldierCopy.commanderNote}</span>
              </div>
              <p className="t-detail mt-1 leading-relaxed text-ink">{note}</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const effectiveRole = useEffectiveRole()
  const { soldierPreview, setSoldierPreview, signOut } = useSession()
  const myTrainings = useMyTrainings()
  const selectedTraining = useSelectedTraining()
  const setSelectedTraining = useUi((s) => s.setSelectedTraining)

  if (!user || !effectiveRole) return null

  const visibleNav = navItems.filter((item) => item.roles.includes(effectiveRole))
  const canPreview = user.role !== 'SOLDIER'

  return (
    <div className="flex h-full flex-col">
      {/* Top navbar — full width, above the sidebar in hierarchy. z-30 lets the
          user/bell dropdowns overflow above the content column below. */}
      <header className="relative z-30 flex items-center justify-between gap-4 border-b border-line bg-panel py-2 ps-4 pe-10 backdrop-blur-md">
        {/* Right (RTL start): the logo, sized to sit over the sidebar column. */}
        <div className="flex w-60 shrink-0 items-center ps-3">
          <Wordmark size="nav" />
        </div>

        {/* Middle — blank in production; temporary switch-user for free design. */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              signOut()
              navigate('/select-account')
            }}
          >
            {buttons.switchUser}
          </Button>
          {canPreview ? (
            <Button
              variant={soldierPreview ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSoldierPreview(!soldierPreview)}
            >
              <Icon name="eye" size={16} />
              {soldierPreview ? buttons.backToEditing : buttons.soldierPreview}
            </Button>
          ) : null}
          {effectiveRole !== 'SOLDIER' && myTrainings.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select
                value={selectedTraining?.id ?? ''}
                onChange={(e) => setSelectedTraining(e.target.value)}
                className="w-60"
              >
                {myTrainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {selectedTraining ? (
                <span className="tnum t-detail hidden text-ink-muted xl:block">
                  {formatDateHe(selectedTraining.startDate)} — {formatDateHe(selectedTraining.endDate)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Left (RTL end): bell + user menu */}
        <div className="flex items-center gap-5 ps-3">
          <NotificationsBell />
          <UserMenu />
        </div>
      </header>

      {/* Below the navbar: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-s border-line bg-panel pt-3 backdrop-blur-md">
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
            {visibleNav.map((item) => (
              <div key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/schedule'}
                  className={({ isActive }) =>
                    clsx(
                      'focus-ring t-body flex items-center gap-3 rounded-xl px-3 py-2 font-medium transition-colors',
                      isActive
                        ? 'bg-primary-soft text-primary-hover'
                        : 'text-ink-muted hover:bg-neutral-block hover:text-ink'
                    )
                  }
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </NavLink>
                {item.to === '/my-schedule' && effectiveRole === 'SOLDIER' ? (
                  <SidebarCommanderNote />
                ) : null}
              </div>
            ))}
          </nav>
          <div className="flex flex-col items-start gap-1.5 border-t border-line px-5 py-4">
            <img src={artechLogo} alt="ARTECH" className="h-6 w-auto" />
            <p className="text-[11px] leading-relaxed text-ink-muted">מערך ההדרכה — בה״ד 15</p>
          </div>
        </aside>

        {/* Content column: the cool grey canvas shows through so white cards pop. */}
        <div className="flex min-w-0 flex-1 flex-col bg-transparent">
          {soldierPreview ? (
            <div className="t-detail border-b border-primary/20 bg-primary-soft px-6 py-1.5 text-center font-medium text-primary-hover">
              תצוגת חייל פעילה — מוצג לו״ז שפורסם בלבד.
            </div>
          ) : null}
          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

function roleIcon(role: UserRole): IconName {
  switch (role) {
    case 'SOLDIER':
      return 'soldier'
    case 'TRAINING_COMMANDER':
      return 'commander'
    case 'SENIOR_COMMANDER':
      return 'senior-commander'
    case 'ADMIN':
      return 'admin'
  }
}
