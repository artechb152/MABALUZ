import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSession } from '@/app/sessionStore'
import { AppShell } from '@/app/AppShell'
import { LoginScreen } from '@/features/auth/LoginScreen'
import { RoleSwitcherPage } from '@/features/auth/RoleSwitcherPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SoldierSchedulePage } from '@/features/schedule/SoldierSchedulePage'
import { ScheduleBuilderPage } from '@/features/schedule/ScheduleBuilderPage'
import { MonthViewPage } from '@/features/schedule/MonthViewPage'
import { DisplayModePage } from '@/features/schedule/DisplayModePage'
import { TrainingListPage } from '@/features/trainings/TrainingListPage'
import { CreateTrainingWizard } from '@/features/trainings/CreateTrainingWizard'
import { ExcelImportPage } from '@/features/excel-import/ExcelImportPage'
import { SharedEventsPage } from '@/features/shared-events/SharedEventsPage'
import { PeakDaysPage } from '@/features/peak-days/PeakDaysPage'
import { GuestLecturersPage } from '@/features/guest-lecturers/GuestLecturersPage'
import { LecturerConfirmationPage } from '@/features/guest-lecturers/LecturerConfirmationPage'
import { ConflictCenterPage } from '@/features/conflict-center/ConflictCenterPage'
import { MessageCenterPage } from '@/features/message-center/MessageCenterPage'
import { VersionsPage } from '@/features/versions/VersionsPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { FaqPage } from '@/features/faq/FaqPage'
import { ContactPage } from '@/features/faq/ContactPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { UserSettingsPage } from '@/features/profile/UserSettingsPage'

function RequireUser({ children }: { children: ReactNode }) {
  const currentUser = useSession((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LoginScreen />} />
        <Route path="/select-account" element={<RoleSwitcherPage />} />
        {/* Public mock route for lecturer email confirmation links */}
        <Route path="/lecturer-confirmation/:token" element={<LecturerConfirmationPage />} />
        {/* Full-screen projection view */}
        <Route
          path="/display"
          element={
            <RequireUser>
              <DisplayModePage />
            </RequireUser>
          }
        />
        <Route
          element={
            <RequireUser>
              <AppShell />
            </RequireUser>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-schedule" element={<SoldierSchedulePage />} />
          <Route path="/trainings" element={<TrainingListPage />} />
          <Route path="/trainings/new" element={<CreateTrainingWizard />} />
          <Route path="/schedule" element={<ScheduleBuilderPage />} />
          <Route path="/schedule/month" element={<MonthViewPage />} />
          <Route path="/import" element={<ExcelImportPage />} />
          <Route path="/shared" element={<SharedEventsPage />} />
          <Route path="/peak-days" element={<PeakDaysPage />} />
          <Route path="/lecturers" element={<GuestLecturersPage />} />
          <Route path="/conflicts" element={<ConflictCenterPage />} />
          <Route path="/messages" element={<MessageCenterPage />} />
          <Route path="/versions" element={<VersionsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/user-settings" element={<UserSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
