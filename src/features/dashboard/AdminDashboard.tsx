import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Icon } from '@/assets/icons/Icon'
import { dashboards, messageCenter, nav, warnings } from '@/lib/hebrewCopy'
import { useCurrentUser } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { SectionCard, StatCard } from './widgets'
import { dashCopy } from './copy'

export function AdminDashboard() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { users, trainings, messages, changeRequests } = useDb()

  const pending = changeRequests.filter((r) => r.status === 'PENDING').length

  return (
    <div>
      <PageHeader
        title={user ? dashCopy.hello(user.firstName) : nav.dashboard}
        subtitle={nav.adminArea}
        actions={
          <Button onClick={() => navigate('/admin')}>
            <Icon name="admin" size={16} />
            {nav.adminArea}
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={dashCopy.totalUsers} value={users.length} icon="users" tone="primary" onClick={() => navigate('/admin')} />
        <StatCard label={dashCopy.totalTrainings} value={trainings.length} icon="training" tone="primary" onClick={() => navigate('/trainings')} />
        <StatCard
          label={dashboards.pendingApprovals}
          value={pending}
          icon="shared-schedule"
          tone={pending > 0 ? 'warning' : 'neutral'}
          onClick={() => navigate('/shared')}
        />
        <StatCard label={dashCopy.messagesSent} value={messages.length} icon="message-center" tone="neutral" onClick={() => navigate('/messages')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={dashCopy.adminQuickLinks}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/admin')}>
              <Icon name="users" size={16} />
              {nav.userManagement}
            </Button>
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/trainings')}>
              <Icon name="training" size={16} />
              {nav.myTrainings}
            </Button>
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/messages')}>
              <Icon name="message-center" size={16} />
              {nav.messageCenter}
            </Button>
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/faq')}>
              <Icon name="faq" size={16} />
              {nav.faq}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={dashCopy.systemStatus}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-success">
              <Icon name="success" size={15} />
              {messageCenter.mockProvider}
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-neutral-block px-3 py-2 text-ink-muted">
              <Icon name="message-center" size={15} />
              {messageCenter.outlookDisabled}
            </div>
            <p className="whitespace-pre-line pt-1 text-xs text-ink-muted">{warnings.offlineEnvironment}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
