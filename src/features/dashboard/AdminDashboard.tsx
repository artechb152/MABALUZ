import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
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
        actions={<Button onClick={() => navigate('/admin')}>{nav.adminArea}</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={dashCopy.totalUsers} value={users.length} tone="primary" onClick={() => navigate('/admin')} />
        <StatCard label={dashCopy.totalTrainings} value={trainings.length} tone="primary" onClick={() => navigate('/trainings')} />
        <StatCard
          label={dashboards.pendingApprovals}
          value={pending}
          tone={pending > 0 ? 'warning' : 'neutral'}
          onClick={() => navigate('/shared')}
        />
        <StatCard label={dashCopy.messagesSent} value={messages.length} tone="neutral" onClick={() => navigate('/messages')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={dashCopy.adminQuickLinks}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/admin')}>
              {nav.userManagement}
            </Button>
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/trainings')}>
              {nav.myTrainings}
            </Button>
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/messages')}>
              {nav.messageCenter}
            </Button>
            <Button variant="secondary" className="justify-start" onClick={() => navigate('/faq')}>
              {nav.faq}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={dashCopy.systemStatus}>
          <div className="space-y-2 text-[15px]">
            <div className="rounded-xl bg-success-soft px-3 py-2 text-success">{messageCenter.mockProvider}</div>
            <div className="rounded-xl bg-neutral-block px-3 py-2 text-ink-muted">{messageCenter.outlookDisabled}</div>
            <p className="whitespace-pre-line pt-1 text-[13px] text-ink-muted">{warnings.offlineEnvironment}</p>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
