import { useEffectiveRole } from '@/app/hooks'
import { SoldierDashboard } from './SoldierDashboard'
import { CommanderDashboard } from './CommanderDashboard'
import { SeniorDashboard } from './SeniorDashboard'
import { AdminDashboard } from './AdminDashboard'

export function DashboardPage() {
  const role = useEffectiveRole()
  switch (role) {
    case 'SOLDIER':
      return <SoldierDashboard />
    case 'TRAINING_COMMANDER':
      return <CommanderDashboard />
    case 'SENIOR_COMMANDER':
      return <SeniorDashboard />
    case 'ADMIN':
      return <AdminDashboard />
    default:
      return null
  }
}
