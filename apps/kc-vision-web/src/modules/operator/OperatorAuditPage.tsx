import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { VISION_AUDIT_TRAIL } from '../../fixtures/operator.fixtures'
import { visionUserById } from '../users/fixtures'
import { RequireRole } from '../../components/RequireRole'

export function OperatorAuditPage() {
  const { caseId } = useParams()
  const rows = VISION_AUDIT_TRAIL.filter((a) => a.case_id === caseId)

  return (
    <RequireRole allow={['operator', 'admin', 'super_admin']}>
      <div>
        <PageHeader
          title="Audit trail"
          action={
            <Link
              to={`/donations/shiduchim-tov/cases/${caseId}`}
              className="text-sm text-teal-700"
            >
              ← חזרה למקרה
            </Link>
          }
        />
        <ul className="space-y-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
            >
              <span className="font-mono text-xs text-slate-500">{a.at}</span>
              <p>
                {visionUserById(a.actor_id)?.name}: <strong>{a.action}</strong>
              </p>
              {a.details ? <p className="text-xs text-slate-600">{a.details}</p> : null}
            </li>
          ))}
        </ul>
      </div>
    </RequireRole>
  )
}
