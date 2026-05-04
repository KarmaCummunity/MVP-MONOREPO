import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { VISION_RIDES } from '../../fixtures/rides.fixtures'

export function RidesListPage() {
  return (
    <div>
      <PageHeader title="נסיעות" subtitle="§2.4" />
      <ul className="space-y-3">
        {VISION_RIDES.map((r) => (
          <li key={r.id}>
            <Link
              to={`/rides/${r.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-500"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {r.from_city} → {r.to_city}
                </span>
                <Badge variant="outline">{r.seats_left} מקומות</Badge>
              </div>
              <p className="text-sm text-slate-500">
                {new Date(r.departure_at).toLocaleString('he-IL')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
