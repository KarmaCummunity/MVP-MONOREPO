import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { VISION_ITEMS } from '../../fixtures/items.fixtures'

export function ItemsListPage() {
  const [q, setQ] = useState('')
  const list = VISION_ITEMS.filter(
    (i) =>
      i.title.includes(q) ||
      i.description.includes(q) ||
      i.category.includes(q),
  )
  return (
    <div>
      <PageHeader title="פריטים" subtitle="§2.6" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש"
        className="mb-4 w-full max-w-md rounded-lg border px-3 py-2"
      />
      <ul className="space-y-2">
        {list.map((i) => (
          <li key={i.id}>
            <Link
              to={`/items/${i.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
            >
              <span className="font-medium">{i.title}</span>
              <Badge>{i.status}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
