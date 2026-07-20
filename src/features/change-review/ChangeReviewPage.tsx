import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { ScheduleConflict, ScheduleEvent, SharedEventChangeRequest } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { ImpactReportView } from '@/features/conflict-center/ImpactReportView'
import { buildImpactReport, detectConflicts, isHardEvent } from '@/features/scheduling-engine'
import { decideOnChange } from '@/data/services/sharedEventService'
import { useCurrentUser, useDraftSchedule, useSelectedTraining } from '@/app/hooks'
import { useDb } from '@/app/dbStore'
import { changeReview, emptyStates, nav, statusLabels } from '@/lib/hebrewCopy'
import { formatDateHe, toMinutes } from '@/lib/time'

export function ChangeReviewPage() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const user = useCurrentUser()
  const training = useSelectedTraining()
  const draft = useDraftSchedule(training)
  const changeRequests = useDb((s) => s.changeRequests)
  const trainings = useDb((s) => s.trainings)
  const users = useDb((s) => s.users)
  const lecturers = useDb((s) => s.lecturers)
  const sharedGroups = useDb((s) => s.sharedGroups)
  const [feedback, setFeedback] = useState<string | null>(null)

  const pending = useMemo(
    () =>
      changeRequests.filter(
        (r) =>
          r.status === 'PENDING' &&
          r.approvals.some((a) => a.commanderId === user?.id && a.status === 'PENDING')
      ),
    [changeRequests, user]
  )

  const active = requestId
    ? (changeRequests.find((r) => r.id === requestId) ?? null)
    : pending.length === 1
      ? pending[0]
      : null

  if (!training) {
    return (
      <div>
        <PageHeader title={nav.confirmations} />
        <EmptyState message={emptyStates.noTrainings} />
      </div>
    )
  }

  if (!active) {
    return (
      <div>
        <PageHeader title={nav.confirmations} subtitle={changeReview.subtitleList} />
        {pending.length === 0 ? (
          <EmptyState message={changeReview.none} />
        ) : (
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-ink-muted">{changeReview.pickTitle}</h2>
            {pending.map((r) => {
              const from = trainings.find((t) => t.id === r.requestedByTrainingId)?.name ?? ''
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel-solid p-4 shadow-card"
                >
                  <div className="min-w-0">
                    <p className="text-[16px] font-medium text-ink">{r.description}</p>
                    {from ? <p className="text-[13px] text-ink-muted">{from}</p> : null}
                  </div>
                  <Button variant="primary" size="sm" onClick={() => navigate(`/confirmations/${r.id}`)}>
                    {changeReview.reviewCta}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <ChangeReviewDetail
      request={active}
      training={training}
      draftEvents={draft?.events ?? []}
      lockedDates={draft?.lockedDates}
      lecturers={lecturers}
      trainings={trainings}
      users={users}
      sharedGroups={sharedGroups}
      currentUserId={user?.id}
      feedback={feedback}
      onDecided={(msg) => setFeedback(msg)}
      onBack={() => navigate('/dashboard')}
    />
  )
}

function ChangeReviewDetail(props: {
  request: SharedEventChangeRequest
  training: NonNullable<ReturnType<typeof useSelectedTraining>>
  draftEvents: ScheduleEvent[]
  lockedDates?: string[]
  lecturers: Parameters<typeof detectConflicts>[0]['lecturers']
  trainings: Parameters<typeof buildImpactReport>[0]['allTrainings']
  users: Parameters<typeof buildImpactReport>[0]['allUsers']
  sharedGroups: Parameters<typeof buildImpactReport>[0]['sharedGroups']
  currentUserId?: string
  feedback: string | null
  onDecided: (msg: string) => void
  onBack: () => void
}) {
  const navigate = useNavigate()
  const {
    request,
    training,
    draftEvents,
    lockedDates,
    lecturers,
    trainings,
    users,
    sharedGroups,
    currentUserId
  } = props

  const analysis = useMemo(() => {
    const target = draftEvents.find((e) => e.sharedGroupId === request.groupId) ?? null

    const after: ScheduleEvent[] = draftEvents.map((e) =>
      target && e.id === target.id
        ? {
            ...e,
            title: request.newTitle ?? e.title,
            date: request.newDate ?? e.date,
            startTime: request.newStartTime ?? e.startTime,
            endTime: request.newEndTime ?? e.endTime,
            durationMinutes:
              request.newStartTime && request.newEndTime
                ? toMinutes(request.newEndTime) - toMinutes(request.newStartTime)
                : e.durationMinutes
          }
        : e
    )

    const detect = (events: ScheduleEvent[]) =>
      detectConflicts({ events, training, settings: training.settings, lecturers, lockedDates })

    const sig = (c: ScheduleConflict) => `${c.title}|${[...c.eventIds].sort().join(',')}`
    const beforeSigs = new Set(detect(draftEvents).map(sig))
    const conflictsCreated = detect(after).filter((c) => !beforeSigs.has(sig(c)))

    // A created conflict is "hard" when it drags in another non-target hard event.
    const hasHardConflict = conflictsCreated.some((c) =>
      c.eventIds.some((id) => {
        const ev = after.find((e) => e.id === id)
        return ev && ev.id !== target?.id && isHardEvent(ev)
      })
    )
    const flexibleOnly = conflictsCreated.length > 0 && !hasHardConflict

    const report = buildImpactReport({
      summary: request.description,
      trainingId: training.id,
      before: draftEvents,
      after,
      conflictsCreated,
      allTrainings: trainings,
      allUsers: users,
      sharedGroups,
      recommendedAction:
        conflictsCreated.length === 0 ? changeReview.optApproveClean : undefined
    })

    return { target, conflictsCreated, hasHardConflict, flexibleOnly, report }
  }, [request, draftEvents, lockedDates, lecturers, training, trainings, users, sharedGroups])

  const { target, conflictsCreated, hasHardConflict, flexibleOnly, report } = analysis

  const requester = users?.find((u) => u.id === request.requestedByUserId)
  const requesterTraining = trainings?.find((t) => t.id === request.requestedByTrainingId)
  const myTrainingId = request.approvals.find((a) => a.commanderId === currentUserId)?.trainingId

  const currentSlot = target
    ? `${formatDateHe(target.date)} ${target.startTime}–${target.endTime}`
    : '—'
  const proposedSlot = `${formatDateHe(request.newDate ?? target?.date ?? '')} ${request.newStartTime ?? target?.startTime ?? ''}–${request.newEndTime ?? target?.endTime ?? ''}`

  async function decide(decision: 'APPROVED' | 'REJECTED', thenTo?: string) {
    if (!myTrainingId) return
    await decideOnChange(request.id, myTrainingId, decision)
    props.onDecided(decision === 'APPROVED' ? changeReview.approvedToast : changeReview.rejectedToast)
    if (thenTo) navigate(thenTo)
  }

  const flexNote = hasHardConflict
    ? changeReview.flexHard
    : flexibleOnly
      ? changeReview.flexFlexibleOnly
      : changeReview.flexNoConflicts

  return (
    <div>
      <PageHeader
        title={changeReview.title}
        subtitle={training.name}
        actions={
          <Button variant="ghost" size="sm" onClick={props.onBack}>
            {nav.dashboard}
          </Button>
        }
      />

      {props.feedback ? (
        <div className="mb-4 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-hover">
          {props.feedback}
        </div>
      ) : null}

      <div className="space-y-4">
        {/* Request summary */}
        <section className="rounded-2xl border border-line bg-panel-solid p-5 shadow-card">
          <p className="text-[18px] font-semibold text-ink">{request.description}</p>
          {requester ? (
            <p className="mt-1 text-[14px] text-ink-muted">
              {changeReview.requestedBy}: {requester.displayName}
              {requesterTraining ? ` · ${requesterTraining.name}` : ''}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-neutral-block/60 px-4 py-3">
              <p className="text-[12px] font-medium text-ink-muted">{changeReview.currentSlot}</p>
              <p className="tnum mt-0.5 text-[15px] font-medium text-ink" dir="ltr">
                {currentSlot}
              </p>
            </div>
            <div className="rounded-xl bg-primary-soft px-4 py-3">
              <p className="text-[12px] font-medium text-primary-hover">{changeReview.proposedSlot}</p>
              <p className="tnum mt-0.5 text-[15px] font-semibold text-primary-hover" dir="ltr">
                {proposedSlot}
              </p>
            </div>
          </div>
        </section>

        {/* Flexibility explainer */}
        <section className="rounded-2xl border border-line bg-panel-solid p-5 shadow-card">
          <h2 className="mb-2 text-[16px] font-semibold text-ink">{changeReview.flexTitle}</h2>
          <p className="text-[14px] leading-relaxed text-ink-muted">{changeReview.flexLockedShared}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink">{flexNote}</p>
        </section>

        {/* Full impact analysis (reused view) */}
        <section className="rounded-2xl border border-line bg-panel-solid p-5 shadow-card">
          <h2 className="mb-3 text-[16px] font-semibold text-ink">{changeReview.impactTitle}</h2>
          <ImpactReportView report={report} />
        </section>

        {/* Solutions */}
        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold text-ink">{changeReview.solutionsTitle}</h2>

          <SolutionCard
            recommended={conflictsCreated.length === 0}
            title={changeReview.optApproveTitle}
            lines={[
              changeReview.optApproveDesc(proposedSlot),
              conflictsCreated.length === 0
                ? changeReview.optApproveClean
                : changeReview.optApproveConflicts(conflictsCreated.length)
            ]}
            cta={changeReview.optApproveCta}
            ctaVariant="primary"
            disabled={!myTrainingId}
            onClick={() => void decide('APPROVED', '/dashboard')}
          />

          {flexibleOnly ? (
            <SolutionCard
              title={changeReview.optAutoTitle}
              lines={[changeReview.optAutoDesc(conflictsCreated.length)]}
              cta={changeReview.optAutoCta}
              ctaVariant="secondary"
              disabled={!myTrainingId}
              onClick={() => void decide('APPROVED', '/conflicts')}
            />
          ) : null}

          <SolutionCard
            title={changeReview.optRejectTitle}
            lines={[
              changeReview.optRejectDesc,
              requester?.phone
                ? changeReview.optRejectContact(requester.displayName, requester.phone)
                : ''
            ].filter(Boolean)}
            cta={changeReview.optRejectCta}
            ctaVariant="danger"
            disabled={!myTrainingId}
            onClick={() => void decide('REJECTED', '/dashboard')}
          />
        </section>
      </div>
    </div>
  )
}

function SolutionCard(props: {
  title: string
  lines: string[]
  cta: string
  ctaVariant: 'primary' | 'secondary' | 'danger'
  recommended?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-panel-solid p-5 shadow-card">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[16px] font-semibold text-ink">{props.title}</h3>
          {props.recommended ? <Badge tone="primary">{statusLabels.recommended}</Badge> : null}
        </div>
        <div className="mt-1.5 space-y-1">
          {props.lines.map((line, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-ink-muted">
              {line}
            </p>
          ))}
        </div>
      </div>
      <Button variant={props.ctaVariant} size="sm" disabled={props.disabled} onClick={props.onClick}>
        {props.cta}
      </Button>
    </div>
  )
}
