import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { VISION_MATCHING_CASES } from '../../fixtures/operator.fixtures'
import { RequireRole } from '../../components/RequireRole'

export function OperatorCaseListPage() {
  return (
    <RequireRole allow={['operator', 'admin', 'super_admin']}>
      <div>
        <PageHeader title="מקרי התאמה" subtitle="§2.14.3" />
        <ul className="space-y-2">
          {VISION_MATCHING_CASES.map((c) => (
            <li key={c.id}>
              <Link
                to={`/donations/shiduchim-tov/cases/${c.id}`}
                className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-400"
              >
                <span className="font-medium">{c.id}</span>
                <Badge>{c.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </RequireRole>
  )
}
