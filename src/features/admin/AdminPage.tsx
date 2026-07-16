import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FaqItem, FeatureToggles, UserRole } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Tabs } from '@/components/Tabs'
import { Field, Input, Select, TextArea } from '@/components/Input'
import { Toggle } from '@/components/Toggle'
import { Icon } from '@/assets/icons/Icon'
import {
  approvals,
  buttons,
  emptyStates,
  generic,
  nav,
  roleLabels,
  settingsCopy,
  trainingStatusLabels,
  warnings
} from '@/lib/hebrewCopy'
import { useDb } from '@/app/dbStore'
import { deleteFaqItem, getSupportPhone, setToggle, upsertFaqItem } from '@/data/services/adminService'
import { updateUser } from '@/data/services/userService'
import { formatDateHe } from '@/lib/time'
import { adminCopy } from './copy'

const FUTURE_TOGGLES: (keyof FeatureToggles)[] = [
  'enableRealAuth',
  'enableMongoDb',
  'enableOutlookIntegration',
  'enableAiAnalysis'
]

export function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('users')
  const { users, trainings, toggles, faq, messages, notifications } = useDb()

  return (
    <div>
      <PageHeader
        title={nav.adminArea}
        actions={
          <Button variant="secondary" onClick={() => navigate('/')}>
            <Icon name="eye" size={16} />
            {adminCopy.previewLogin}
          </Button>
        }
      />

      <div className="mb-5 overflow-x-auto">
        <Tabs
          items={[
            { key: 'users', label: adminCopy.tabs.users, badge: users.length },
            { key: 'trainings', label: adminCopy.tabs.trainings, badge: trainings.length },
            { key: 'toggles', label: adminCopy.tabs.toggles },
            { key: 'approvals', label: adminCopy.tabs.approvals },
            { key: 'faq', label: adminCopy.tabs.faq, badge: faq.length },
            { key: 'logs', label: adminCopy.tabs.logs },
            { key: 'settings', label: adminCopy.tabs.settings }
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'users' ? (
        <div className="glass-solid overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-neutral-block/70 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">{generic.name}</th>
                <th className="px-3 py-2.5 text-start font-medium">{generic.personalNumber}</th>
                <th className="px-3 py-2.5 text-start font-medium">{adminCopy.roleColumn}</th>
                <th className="px-3 py-2.5 text-start font-medium">{generic.phone}</th>
                <th className="px-3 py-2.5 text-start font-medium">{generic.email}</th>
                <th className="px-3 py-2.5 text-start font-medium">{adminCopy.profileStatus}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-3 py-2 font-medium text-ink">{u.displayName}</td>
                  <td className="tnum px-3 py-2 text-ink-muted">{u.personalNumber}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={u.role}
                      onChange={(e) => void updateUser(u.id, { role: e.target.value as UserRole })}
                      className="w-40"
                    >
                      {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="tnum px-3 py-2 text-ink-muted">{u.phone ?? ''}</td>
                  <td className="px-3 py-2 text-ink-muted">{u.email ?? ''}</td>
                  <td className="px-3 py-2">
                    <Badge tone={u.profileStatus === 'ACTIVE' ? 'success' : 'warning'}>
                      {u.profileStatus === 'ACTIVE' ? 'פעיל' : u.profileStatus === 'DISABLED' ? 'מושבת' : 'ממתין לאישור'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'trainings' ? (
        <div className="glass-solid overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-neutral-block/70 text-xs text-ink-muted">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">{generic.name}</th>
                <th className="px-3 py-2.5 text-start font-medium">סימול</th>
                <th className="px-3 py-2.5 text-start font-medium">מפקד</th>
                <th className="px-3 py-2.5 text-start font-medium">תאריכים</th>
                <th className="px-3 py-2.5 text-start font-medium">{generic.status}</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map((t) => {
                const commander = users.find((u) => u.id === t.commanderId)
                return (
                  <tr key={t.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{t.name}</td>
                    <td className="px-3 py-2 text-ink-muted">{t.symbol}</td>
                    <td className="px-3 py-2 text-ink-muted">{commander?.displayName}</td>
                    <td className="tnum px-3 py-2 text-ink-muted">
                      {formatDateHe(t.startDate)} — {formatDateHe(t.endDate)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={t.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {trainingStatusLabels[t.status]}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'toggles' ? (
        <div className="glass-solid max-w-2xl space-y-3 p-5">
          {(Object.keys(adminCopy.toggleLabels) as (keyof FeatureToggles)[]).map((key) => {
            const future = FUTURE_TOGGLES.includes(key)
            return (
              <div key={key} className="flex items-center justify-between rounded-xl border border-line bg-panel-solid px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-ink">{adminCopy.toggleLabels[key]}</div>
                  {future ? <div className="text-xs text-ink-muted">{adminCopy.futureToggleNote}</div> : null}
                </div>
                <Toggle
                  checked={toggles[key]}
                  disabled={future}
                  onChange={(v) => void setToggle(key, v)}
                />
              </div>
            )
          })}
        </div>
      ) : null}

      {tab === 'approvals' ? (
        <div className="max-w-2xl space-y-4">
          <EmptyState message={adminCopy.noApprovals} />
          <div className="card-tex p-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">{adminCopy.approvalExampleTitle}</h3>
            <p className="whitespace-pre-line rounded-xl bg-neutral-block px-4 py-3 text-sm text-ink-muted">
              {approvals.trainingCommanderPending}
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'faq' ? <FaqEditor faq={faq} /> : null}

      {tab === 'logs' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-tex p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">{adminCopy.messagesLog}</h3>
            {messages.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">{emptyStates.noMessages}</p>
            ) : (
              <div className="max-h-96 space-y-1.5 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-line bg-panel-solid px-3 py-2 text-xs">
                    <div className="font-medium text-ink">{m.subject}</div>
                    <div className="tnum text-ink-muted">
                      {m.recipient} | {formatDateHe(m.sentAt.slice(0, 10))} {m.sentAt.slice(11, 16)} | {m.provider}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card-tex p-5">
            <h3 className="mb-3 text-sm font-semibold text-ink">{adminCopy.notificationsLog}</h3>
            {notifications.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">{emptyStates.noNotifications}</p>
            ) : (
              <div className="max-h-96 space-y-1.5 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-xl border border-line bg-panel-solid px-3 py-2 text-xs">
                    <div className="font-medium text-ink">{n.title}</div>
                    <div className="tnum text-ink-muted">
                      {formatDateHe(n.createdAt.slice(0, 10))} {n.createdAt.slice(11, 16)}
                      {n.body ? ` | ${n.body}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="glass-solid max-w-2xl space-y-3 p-5">
          <div className="flex items-center justify-between rounded-xl border border-line bg-panel-solid px-4 py-3 text-sm">
            <span className="font-medium text-ink">{adminCopy.supportPhone}</span>
            {getSupportPhone() ? (
              <Badge tone="success">{getSupportPhone()}</Badge>
            ) : (
              <span className="text-xs text-warning">{settingsCopy.supportContactMissing}</span>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-line bg-panel-solid px-4 py-3 text-sm">
            <span className="font-medium text-ink">{adminCopy.appEnv}</span>
            <Badge tone="primary">{import.meta.env.VITE_APP_ENV ?? 'dev'}</Badge>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-neutral-block px-4 py-3 text-sm text-ink-muted">
            <Icon name="warning" size={15} className="mt-0.5 shrink-0" />
            <span className="whitespace-pre-line">{warnings.offlineEnvironment}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FaqEditor({ faq }: { faq: FaqItem[] }) {
  const [editing, setEditing] = useState<FaqItem | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [order, setOrder] = useState(faq.length + 1)

  function startEdit(item: FaqItem | null) {
    setEditing(item)
    setQuestion(item?.question ?? '')
    setAnswer(item?.answer ?? '')
    setOrder(item?.order ?? faq.length + 1)
  }

  async function save() {
    if (!question.trim() || !answer.trim()) return
    await upsertFaqItem({
      id: editing?.id,
      question: question.trim(),
      answer: answer.trim(),
      order
    })
    startEdit(null)
    setQuestion('')
    setAnswer('')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        {[...faq]
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <div key={item.id} className="glass-solid flex items-start justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">
                  <span className="tnum text-ink-muted">{item.order}. </span>
                  {item.question}
                </div>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-ink-muted">{item.answer}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                  {buttons.edit}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void deleteFaqItem(item.id)}>
                  <Icon name="trash" size={14} />
                </Button>
              </div>
            </div>
          ))}
      </div>

      <div className="glass-solid h-fit p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">
          {editing ? buttons.edit : adminCopy.addFaq}
        </h3>
        <div className="space-y-3">
          <Field label={adminCopy.faqQuestion} required>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
          </Field>
          <Field label={adminCopy.faqAnswer} required>
            <TextArea value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-32" />
          </Field>
          <Field label={adminCopy.faqOrder}>
            <Input type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value) || 1)} className="w-24" />
          </Field>
          <div className="flex items-center gap-2">
            <Button onClick={() => void save()}>{buttons.save}</Button>
            {editing ? (
              <Button variant="ghost" onClick={() => startEdit(null)}>
                {buttons.cancel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
