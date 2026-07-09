import { useMemo, useState } from 'react'
import type { GuestLecturer, ScheduleEvent } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Tabs } from '@/components/Tabs'
import { Input } from '@/components/Input'
import { Icon } from '@/assets/icons/Icon'
import {
  buttons,
  confirmationStatusLabels,
  emptyStates,
  generic,
  lecturers as lecturersCopy,
  nav
} from '@/lib/hebrewCopy'
import { useDraftSchedule, useSelectedTraining } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { formatDateHe } from '@/lib/time'
import { LecturerFormModal } from './LecturerFormModal'
import { AddLectureModal } from './AddLectureModal'
import { CancelLectureFlow } from './CancelLectureFlow'
import { lectCopy } from './copy'

export function GuestLecturersPage() {
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const { lecturers, guestLectureDetails } = useDb()

  const [tab, setTab] = useState<'lectures' | 'database'>('lectures')
  const [search, setSearch] = useState('')
  const [lecturerModal, setLecturerModal] = useState<{ open: boolean; lecturer: GuestLecturer | null }>({ open: false, lecturer: null })
  const [addLectureOpen, setAddLectureOpen] = useState(false)
  const [cancelFor, setCancelFor] = useState<ScheduleEvent | null>(null)
  const [copiedFor, setCopiedFor] = useState<string | null>(null)

  const lectures = useMemo(
    () =>
      (draft?.events ?? [])
        .filter((e) => e.type === 'GUEST_LECTURE')
        .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)),
    [draft]
  )

  const filteredLecturers = useMemo(() => {
    const q = search.trim()
    if (!q) return lecturers
    return lecturers.filter(
      (l) =>
        l.fullName.includes(q) ||
        l.role.includes(q) ||
        (l.organization ?? '').includes(q) ||
        l.lectureTypes.some((t) => t.includes(q))
    )
  }, [lecturers, search])

  function detailsFor(eventId: string) {
    return guestLectureDetails.find((d) => d.eventId === eventId || `${d.eventId}-d` === eventId) ?? null
  }

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.guestLecturers} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={nav.guestLecturers}
        subtitle={training.name}
        actions={
          <>
            <Button variant="secondary" onClick={() => setLecturerModal({ open: true, lecturer: null })}>
              <Icon name="plus" size={16} />
              {lecturersCopy.addNewLecturer}
            </Button>
            <Button onClick={() => setAddLectureOpen(true)}>
              <Icon name="guest-lecturer" size={16} />
              {buttons.addGuestLecture}
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Tabs
          items={[
            { key: 'lectures', label: lectCopy.lecturesTab, badge: lectures.length },
            { key: 'database', label: lecturersCopy.lectureDatabase, badge: lecturers.length }
          ]}
          active={tab}
          onChange={(k) => setTab(k as 'lectures' | 'database')}
        />
      </div>

      {tab === 'lectures' ? (
        lectures.length === 0 ? (
          <EmptyState message={lectCopy.noLectures} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {lectures.map((event) => {
              const details = detailsFor(event.id)
              const lecturer = lecturers.find((l) => l.id === (details?.lecturerId ?? event.lecturerId))
              return (
                <div key={event.id} className="glass p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon name="guest-lecturer" size={17} />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold text-ink">{event.title}</h2>
                        <p className="tnum text-xs text-ink-muted">
                          {formatDateHe(event.date)} | {event.startTime}-{event.endTime}
                          {event.location ? ` | ${event.location}` : ''}
                        </p>
                      </div>
                    </div>
                    {details ? (
                      <Badge
                        tone={
                          details.confirmationStatus === 'CONFIRMED'
                            ? 'success'
                            : details.confirmationStatus === 'REMINDER_SENT'
                              ? 'primary'
                              : details.confirmationStatus === 'CANCELLED'
                                ? 'danger'
                                : 'neutral'
                        }
                      >
                        {confirmationStatusLabels[details.confirmationStatus]}
                      </Badge>
                    ) : null}
                  </div>

                  {lecturer ? (
                    <div className="mb-3 space-y-1 rounded-xl bg-neutral-block/60 px-3 py-2 text-sm">
                      <div className="font-medium text-ink">{lecturer.fullName} — {lecturer.role}</div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                        <a href={`tel:${lecturer.phone}`} className="tnum flex items-center gap-1 text-primary-hover">
                          <Icon name="phone" size={12} />
                          {lecturer.phone}
                        </a>
                        <span className="flex items-center gap-1">
                          <Icon name="mail" size={12} />
                          {lecturer.email}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {details?.reminderSentAt ? (
                    <p className="tnum mb-2 text-xs text-ink-muted">
                      {lectCopy.reminderAt(formatDateHe(details.reminderSentAt.slice(0, 10)))}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="danger" size="sm" onClick={() => setCancelFor(event)}>
                      {buttons.markLecturerCancelled}
                    </Button>
                    {details ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = `${window.location.origin}${window.location.pathname}#/lecturer-confirmation/${details.confirmationToken}`
                          void navigator.clipboard?.writeText(link)
                          setCopiedFor(event.id)
                        }}
                      >
                        <Icon name="link" size={14} />
                        {copiedFor === event.id ? lectCopy.linkCopied : lectCopy.copyConfirmLink}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div>
          <div className="mb-3 max-w-sm">
            <Input
              placeholder={lecturersCopy.searchLecturer}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredLecturers.length === 0 ? (
            <EmptyState message={emptyStates.noLecturers} />
          ) : (
            <div className="glass-solid overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-neutral-block/70 text-xs text-ink-muted">
                  <tr>
                    <th className="px-3 py-2.5 text-start font-medium">{generic.name}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{generic.role}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{generic.organization}</th>
                    <th className="px-3 py-2.5 text-start font-medium">נושאי הרצאה</th>
                    <th className="px-3 py-2.5 text-start font-medium">{generic.phone}</th>
                    <th className="px-3 py-2.5 text-start font-medium">{generic.email}</th>
                    <th className="px-3 py-2.5 text-start font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLecturers.map((l) => (
                    <tr key={l.id} className="border-t border-line">
                      <td className="px-3 py-2 font-medium text-ink">{l.fullName}</td>
                      <td className="px-3 py-2 text-ink-muted">{l.role}</td>
                      <td className="px-3 py-2 text-ink-muted">{l.organization ?? ''}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {l.lectureTypes.map((t) => (
                            <Badge key={t} tone="primary">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="tnum px-3 py-2 text-ink-muted">{l.phone}</td>
                      <td className="px-3 py-2 text-ink-muted">{l.email}</td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" onClick={() => setLecturerModal({ open: true, lecturer: l })}>
                          {buttons.edit}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {lecturerModal.open ? (
        <LecturerFormModal
          lecturer={lecturerModal.lecturer}
          onClose={() => setLecturerModal({ open: false, lecturer: null })}
        />
      ) : null}
      {addLectureOpen ? (
        <AddLectureModal training={training} onClose={() => setAddLectureOpen(false)} />
      ) : null}
      {cancelFor ? (
        <CancelLectureFlow training={training} event={cancelFor} onClose={() => setCancelFor(null)} />
      ) : null}
    </div>
  )
}
