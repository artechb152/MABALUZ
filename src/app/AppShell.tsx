import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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
        {unread > 0 ? (
          <span className="absolute -start-1 -top-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-12 z-40 w-96 rounded-2xl border border-line bg-panel-solid shadow-pop">
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
      width={230}
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
        <span className="flex items-center gap-3 rounded-xl border border-line bg-panel-solid px-3.5 py-1.5 transition-colors hover:border-graphite/40 hover:bg-neutral-block/60">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name={roleIcon(user.role)} size={22} />
          </span>
          <span className="text-start leading-tight">
            <span className="t-subhead block font-semibold text-graphite">{user.displayName}</span>
            <span className="t-body block text-stone">{roleLabels[user.role]}</span>
          </span>
          <Icon
            name="chevron-down"
            size={22}
            className={clsx('text-graphite transition-transform duration-300', open && 'rotate-180')}
          />
        </span>
      )}
    />
  )
}

/** Indigo pop-up under the "הלו״ז שלי" nav item — only when a note exists. */
function SidebarCommanderNote() {
  const training = useMyTrainings()[0] ?? null
  const published = usePublishedSchedule(training)
  if (!published?.commanderNote) return null

  return (
    <div className="mx-1 mb-1 mt-1.5 animate-[fadeSlideIn_0.45s_ease]">
      <div className="relative rounded-xl border border-primary/30 bg-primary-soft px-3 py-2.5 shadow-card">
        <span className="absolute -top-1 end-6 h-2.5 w-2.5 rotate-45 border-s border-t border-primary/30 bg-primary-soft" />
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="t-detail font-medium text-primary-hover">{soldierCopy.commanderNote}</span>
        </div>
        <p className="t-detail mt-1 leading-relaxed text-ink">{published.commanderNote}</p>
      </div>
    </div>
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
      {/* Top navbar — full width, above the sidebar in hierarchy. */}
      <header className="flex items-center justify-between gap-4 border-b border-line bg-panel px-6 py-2 backdrop-blur-md">
        {/* Right (RTL start): the logo */}
        <Wordmark size="md" />

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
        <div className="flex items-center gap-3">
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
          <div className="border-t border-line px-5 py-3">
            <p className="t-detail leading-relaxed text-ink-muted">ARTECH — מערך ההדרכה</p>
          </div>
        </aside>

        {/* Content column: whiter than the navbar/sidebar for clear separation. */}
        <div className="flex min-w-0 flex-1 flex-col bg-white">
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
