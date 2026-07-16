import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { mockUsers } from '@/data/mock/users'
import { useSession } from '@/app/sessionStore'
import { app, buttons, entry, roleLabels } from '@/lib/hebrewCopy'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Wordmark } from '@/components/Wordmark'
import type { User, UserRole } from '@/types'

const roleTone: Record<UserRole, 'neutral' | 'primary' | 'success' | 'warning'> = {
  SOLDIER: 'neutral',
  TRAINING_COMMANDER: 'primary',
  SENIOR_COMMANDER: 'success',
  ADMIN: 'warning'
}

// Demo-account picker (route /select-account). Reached from the login screen's
// "skip login" button.
export function RoleSwitcherPage() {
  const navigate = useNavigate()
  const signIn = useSession((s) => s.signIn)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = mockUsers.find((u) => u.id === selectedId) ?? null

  function handleSignIn(user: User | null) {
    if (!user) return
    signIn(user)
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <Wordmark size="xl" className="mb-3 inline-block" />
          <p className="t-subhead text-ink-muted">{app.tagline}</p>
        </div>

        <div className="glass-solid p-6">
          <h2 className="t-subhead mb-1">{entry.chooseUser}</h2>
          <p className="t-body mb-4 text-ink-muted">{entry.devModeNote}</p>

          <div className="mb-6 grid gap-2" role="radiogroup" aria-label={entry.chooseUser}>
            {mockUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                role="radio"
                aria-checked={selectedId === user.id}
                onClick={() => setSelectedId(user.id)}
                onDoubleClick={() => handleSignIn(user)}
                className={clsx(
                  'focus-ring flex items-center justify-between rounded-xl border px-4 py-3 text-right transition-colors',
                  selectedId === user.id
                    ? 'border-primary bg-primary-soft'
                    : 'border-line bg-panel-solid hover:border-primary/40 hover:bg-primary-soft/40'
                )}
              >
                <span className="t-body font-medium text-ink">{user.displayName}</span>
                <Badge tone={roleTone[user.role]}>{roleLabels[user.role]}</Badge>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button size="lg" className="flex-1" disabled={!selected} onClick={() => handleSignIn(selected)}>
              {buttons.signIn}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate('/')}>
              {entry.backToLogin}
            </Button>
          </div>
        </div>

        <p className="t-detail mt-6 text-center text-ink-muted">{app.orgCredit}</p>
      </div>
    </div>
  )
}
