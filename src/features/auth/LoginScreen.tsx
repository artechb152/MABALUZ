import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { Wordmark } from '@/components/Wordmark'
import { Button } from '@/components/Button'
import { Field, Input } from '@/components/Input'
import { AnimatedSelect } from '@/components/AnimatedDropdown'
import { app, login } from '@/lib/hebrewCopy'

type Mode = 'signin' | 'register' | 'forgot'

// Cosmetic login/register screen (route /). Nothing is persisted or sent to a
// server yet — fields validate shape only, then the flow drops the data and
// moves to the demo-account picker. Real auth is wired later.
export function LoginScreen() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')

  function proceed() {
    // Drop everything entered (dev-only) and continue to the demo picker.
    navigate('/select-account')
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark size="xl" className="mb-3 inline-block" />
          <p className="t-subhead text-ink-muted">{app.tagline}</p>
        </div>

        <div className="glass p-6">
          {mode !== 'forgot' ? (
            <div
              role="tablist"
              className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-neutral-block p-1"
            >
              {(['signin', 'register'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  type="button"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    'focus-ring t-body rounded-lg py-2 font-medium transition-colors',
                    mode === m ? 'bg-panel-solid text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                  )}
                >
                  {m === 'signin' ? login.tabSignIn : login.tabRegister}
                </button>
              ))}
            </div>
          ) : null}

          {mode === 'signin' ? <SignInForm onSubmit={proceed} onForgot={() => setMode('forgot')} /> : null}
          {mode === 'register' ? <RegisterForm onSubmit={proceed} /> : null}
          {mode === 'forgot' ? <ForgotForm onBack={() => setMode('signin')} /> : null}

          <div className="mt-5 border-t border-line pt-4">
            <p className="t-detail mb-3 text-center text-ink-muted">{login.devNote}</p>
            <Button variant="ghost" className="w-full" onClick={proceed}>
              {login.skipLogin}
            </Button>
          </div>
        </div>

        <p className="t-detail mt-6 text-center text-ink-muted">{app.orgCredit}</p>
      </div>
    </div>
  )
}

function SignInForm({ onSubmit, onForgot }: { onSubmit: () => void; onForgot: () => void }) {
  const [personalNumber, setPersonalNumber] = useState('')
  const [password, setPassword] = useState('')

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <Field label={login.personalNumber}>
        <Input
          value={personalNumber}
          onChange={(e) => setPersonalNumber(e.target.value)}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
        />
      </Field>
      <Field label={login.password}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
      </Field>
      <button type="button" onClick={onForgot} className="focus-ring t-detail text-primary-hover hover:underline">
        {login.forgotPassword}
      </button>
      <Button type="submit" size="lg" className="w-full">
        {login.signInAction}
      </Button>
    </form>
  )
}

function RegisterForm({ onSubmit }: { onSubmit: () => void }) {
  const [fullName, setFullName] = useState('')
  const [personalNumber, setPersonalNumber] = useState('')
  const [status, setStatus] = useState<string>(login.statusOptions[0])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <Field label={login.fullName}>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" />
      </Field>
      <Field label={login.personalNumber}>
        <Input value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} dir="ltr" inputMode="numeric" />
      </Field>
      <Field label={login.status}>
        <AnimatedSelect
          options={login.statusOptions.map((s, i) => ({
            id: s,
            label: s,
            description: login.statusDescriptions[i]
          }))}
          value={status}
          onChange={setStatus}
        />
      </Field>
      <Field label={login.password} hint={login.passwordRule}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
      </Field>
      <Field label={login.confirmPassword}>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" />
      </Field>
      <Button type="submit" size="lg" className="w-full">
        {login.registerAction}
      </Button>
    </form>
  )
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [personalNumber, setPersonalNumber] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="t-subhead mb-1">{login.forgotTitle}</h2>
        <p className="t-body text-ink-muted">{login.forgotBody}</p>
      </div>
      {sent ? (
        <p className="t-body rounded-xl bg-primary-soft px-4 py-3 text-primary-hover">{login.forgotSent}</p>
      ) : (
        <Field label={login.personalNumber}>
          <Input value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} dir="ltr" inputMode="numeric" />
        </Field>
      )}
      <div className="flex items-center gap-2">
        {!sent ? (
          <Button className="flex-1" onClick={() => setSent(true)}>
            {login.forgotSubmit}
          </Button>
        ) : null}
        <Button variant="ghost" className={sent ? 'w-full' : ''} onClick={onBack}>
          {login.backToSignIn}
        </Button>
      </div>
    </div>
  )
}
