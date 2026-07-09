import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Toggle } from '@/components/Toggle'
import { userMenu } from '@/lib/hebrewCopy'

// Basic personal-settings screen (reached from the navbar user menu).
// Placeholders only — nothing is persisted yet.
export function UserSettingsPage() {
  const [inAppNotifications, setInAppNotifications] = useState(true)
  const [scheduleChangeAlerts, setScheduleChangeAlerts] = useState(true)
  const [reminderAlerts, setReminderAlerts] = useState(false)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={userMenu.personalSettingsTitle} />

      <div className="glass space-y-4 p-6">
        <h2 className="t-subhead">התראות</h2>
        <div className="space-y-3">
          <Toggle
            checked={inAppNotifications}
            onChange={setInAppNotifications}
            label="התראות בתוך המערכת"
          />
          <Toggle
            checked={scheduleChangeAlerts}
            onChange={setScheduleChangeAlerts}
            label="עדכון כשמתפרסם שינוי בלו״ז"
          />
          <Toggle
            checked={reminderAlerts}
            onChange={setReminderAlerts}
            label="תזכורת יומית לרכיבי הלו״ז של מחר"
          />
        </div>
        <p className="t-detail border-t border-line pt-3 text-ink-muted">
          ההגדרות בשלב זה הן הדגמה בלבד ואינן נשמרות. שמירה אישית תתווסף עם ההתחברות האמיתית.
        </p>
      </div>
    </div>
  )
}
