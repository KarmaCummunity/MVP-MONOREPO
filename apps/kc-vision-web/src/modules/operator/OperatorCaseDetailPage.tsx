import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import {
  VISION_MATCHING_CASES,
  VISION_MATCHING_CANDIDATES,
  VISION_POSTS,
  VISION_USERS,
} from '../../fixtures'
import { visionUserById } from '../users/fixtures'
import { RequireRole } from '../../components/RequireRole'

export function OperatorCaseDetailPage() {
  const { caseId } = useParams()
  const c = VISION_MATCHING_CASES.find((x) => x.id === caseId)
  const post = c ? VISION_POSTS.find((p) => p.id === c.post_id) : undefined
  const candidates = VISION_MATCHING_CANDIDATES.filter((x) => x.case_id === caseId)

  return (
    <RequireRole allow={['operator', 'admin', 'super_admin']}>
      <div>
        <PageHeader
          title={`מקרה ${caseId ?? ''}`}
          action={
            <Link
              to={`/donations/shiduchim-tov/cases/${caseId}/audit`}
              className="text-sm text-teal-700"
            >
              Audit →
            </Link>
          }
        />
        {!c ? (
          <p>לא נמצא</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">סטטוס</p>
              <Badge className="mt-2">{c.status}</Badge>
              <p className="mt-4 text-sm">{post?.body}</p>
              <p className="mt-2 text-xs text-slate-500">
                מבקש (זהות מלאה לאופרטור):{' '}
                {visionUserById(c.requester_id)?.name}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold">מועמדים</h3>
              <ul className="mt-2 space-y-2">
                {candidates.map((cd) => {
                  const u = visionUserById(cd.candidate_user_id)
                  return (
                    <li key={cd.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                      <span className="font-medium">{u?.name}</span> — {cd.match_reason}
                      <Badge variant="outline" className="mr-2">
                        {cd.status}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <select className="rounded border px-2 py-1 text-sm">
                  {VISION_USERS.filter((u) => u.roles.includes('volunteer')).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="rounded bg-teal-600 px-3 py-1 text-sm text-white">
                  Propose match (דמה)
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 p-4">
              <p className="text-sm font-semibold">ציר זמן</p>
              <p className="text-xs text-slate-600">נוצר → הוקצה → בתהליך → הוצע → …</p>
            </div>
          </div>
        )}
      </div>
    </RequireRole>
  )
}
