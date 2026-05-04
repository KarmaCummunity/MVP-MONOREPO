import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import {
  VISION_OPERATOR_QUEUE,
  type OperatorQueueItem,
} from '../../fixtures/operator.fixtures'
import { RequireRole } from '../../components/RequireRole'

export function OperatorQueuePage() {
  const [items, setItems] = useState<OperatorQueueItem[]>(() => [...VISION_OPERATOR_QUEUE])

  return (
    <RequireRole allow={['operator', 'admin', 'super_admin']}>
      <div>
        <PageHeader title="תור התאמה"/>
        <ul className="space-y-3">
          {items.map((q) => (
            <li
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{q.excerpt}</p>
                  <p className="text-xs text-slate-500">
                    {q.city} · {q.category}
                  </p>
                </div>
                <Badge variant="warning">{q.urgency}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{q.status}</Badge>
                <button
                  type="button"
                  className="rounded bg-teal-600 px-3 py-1 text-sm text-white"
                  onClick={() =>
                    setItems((prev) =>
                      prev.map((x) =>
                        x.id === q.id
                          ? {
                              ...x,
                              status: 'assigned',
                              assigned_operator_id:
                                'user-b203d4ae-6f10-4d8c-9e01-operator-michal',
                            }
                          : x,
                      ),
                    )
                  }
                >
                  Claim (דמה)
                </button>
                <Link
                  to={`/donations/shiduchim-tov/cases/case-1`}
                  className="rounded border px-3 py-1 text-sm text-teal-800"
                >
                  למקרה לדוגמה
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </RequireRole>
  )
}
