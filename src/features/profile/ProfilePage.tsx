import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/Badge'
import { Icon, type IconName } from '@/assets/icons/Icon'
import { generic, roleLabels, userMenu } from '@/lib/hebrewCopy'
import { useCurrentUser, useMyTrainings } from '@/app/hooks'
import { formatDateHe } from '@/lib/time'
import type { UserRole } from '@/types'

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

// Basic profile screen (reached from the navbar user menu). Read-only in v1;
// editing arrives with real auth.
export function ProfilePage() {
  const user = useCurrentUser()
  const trainings = useMyTrainings()

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={userMenu.profileTitle} />

      <div className="glass p-6">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name={roleIcon(user.role)} size={32} />
          </span>
          <div>
            <h2 className="t-subhead font-semibold text-ink">{user.displayName}</h2>
            <Badge tone="primary">{roleLabels[user.role]}</Badge>
          </div>
        </div>

        <dl className="space-y-2.5 border-t border-line pt-4">
          <ProfileRow label={generic.personalNumber} value={user.personalNumber} ltr />
          {user.unit ? <ProfileRow label="יחידה" value={user.unit} /> : null}
          {user.phone ? <ProfileRow label={generic.phone} value={user.phone} ltr /> : null}
          {user.email ? <ProfileRow label={generic.email} value={user.email} ltr /> : null}
          {trainings.map((t) => (
            <ProfileRow
              key={t.id}
              label="הכשרה"
              value={`${t.name} (${formatDateHe(t.startDate)} — ${formatDateHe(t.endDate)})`}
            />
          ))}
        </dl>
      </div>
    </div>
  )
}

function ProfileRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="t-body shrink-0 font-normal text-ink-muted">{label}</dt>
      <span className="t-body text-ink-muted">-</span>
      <dd className={`t-body font-light text-ink ${ltr ? 'tnum' : ''}`} dir={ltr ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  )
}
