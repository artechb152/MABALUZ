import type { ImpactReport } from '@/types'
import { Badge } from '@/components/Badge'
import { Icon } from '@/assets/icons/Icon'
import { conflictSeverityLabels, impact, warnings } from '@/lib/hebrewCopy'
import { formatDateHe } from '@/lib/time'

export function ImpactReportView({ report }: { report: ImpactReport }) {
  const empty =
    report.movedEvents.length === 0 &&
    report.overwrittenEvents.length === 0 &&
    report.affectedTrainings.length === 0 &&
    report.conflictsCreated.length === 0 &&
    report.soldierVisibleChanges.length === 0

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink">{report.summary}</p>
        <Badge tone={report.canUndo ? 'success' : 'warning'}>
          {report.canUndo ? impact.canUndo : impact.cannotUndo}
        </Badge>
      </div>

      {empty ? <p className="text-sm text-ink-muted">אין שינויים מהותיים לדיווח.</p> : null}

      {report.movedEvents.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">{impact.movedEvents}</h3>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-neutral-block/70 text-xs text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">רכיב</th>
                  <th className="px-3 py-2 text-start font-medium">ממועד</th>
                  <th className="px-3 py-2 text-start font-medium">למועד</th>
                </tr>
              </thead>
              <tbody>
                {report.movedEvents.map((m) => (
                  <tr key={m.eventId} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{m.title}</td>
                    <td className="tnum px-3 py-2 text-ink-muted">
                      {formatDateHe(m.fromDate)} {m.fromStartTime}-{m.fromEndTime}
                    </td>
                    <td className="tnum px-3 py-2 text-ink">
                      {formatDateHe(m.toDate)} {m.toStartTime}-{m.toEndTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {report.overwrittenEvents.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">{impact.overwrittenEvents}</h3>
          <ul className="space-y-1.5">
            {report.overwrittenEvents.map((o) => (
              <li key={o.eventId} className="flex items-center gap-2 text-sm text-ink">
                <Icon name="warning" size={14} className="text-warning" />
                <span className="font-medium">{o.title}</span>
                <span className="tnum text-ink-muted">
                  ({formatDateHe(o.date)} {o.startTime}-{o.endTime})
                </span>
                <span className="text-ink-muted">— {o.overwrittenByTitle}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.affectedTrainings.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">{impact.affectedTrainings}</h3>
          <div className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
            {warnings.affectsOtherTrainings}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {report.affectedTrainings.map((t) => (
              <Badge key={t.trainingId} tone="warning">
                {t.trainingName}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {report.approvalsRequired.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">{impact.approvalsRequired}</h3>
          <ul className="space-y-1.5">
            {report.approvalsRequired.map((a) => (
              <li key={a.trainingId} className="flex items-center gap-2 text-sm">
                <Icon name="commander" size={14} className="text-ink-muted" />
                <span className="font-medium text-ink">{a.commanderName}</span>
                <span className="text-ink-muted">({a.trainingName})</span>
                {a.commanderPhone ? (
                  <a href={`tel:${a.commanderPhone}`} className="tnum text-primary-hover underline">
                    {a.commanderPhone}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.conflictsCreated.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">קונפליקטים שנוצרו</h3>
          <ul className="space-y-1.5">
            {report.conflictsCreated.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <Badge tone={c.severity === 'BLOCKING' ? 'danger' : 'warning'}>
                  {conflictSeverityLabels[c.severity]}
                </Badge>
                <span className="text-ink">{c.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.soldierVisibleChanges.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink">{impact.soldierVisibleChanges}</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-muted">
            {report.soldierVisibleChanges.map((s, i) => (
              <li key={i}>{s.description}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.recommendedAction ? (
        <div className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-hover">
          <span className="font-semibold">{impact.recommendedAction}: </span>
          {report.recommendedAction}
        </div>
      ) : null}

      {!report.canUndo ? (
        <div className="whitespace-pre-line rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {warnings.unsafeRollback}
        </div>
      ) : null}
    </div>
  )
}
