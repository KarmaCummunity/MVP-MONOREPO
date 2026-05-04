import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import {
  VISION_ITEMS,
  VISION_ITEM_REQUESTS,
} from '../../fixtures/items.fixtures'
import { getActingUserId, usePersonaStore } from '../../store/personaStore'

export function ItemDetailPage() {
  const { itemId } = useParams()
  const item = VISION_ITEMS.find((i) => i.id === itemId)
  const req = VISION_ITEM_REQUESTS.find((r) => r.item_id === itemId)
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const [reserved, setReserved] = useState(false)

  if (!item) return <p>לא נמצא</p>

  return (
    <div>
      <PageHeader
        title={item.title}
        action={
          <Link to="/items" className="text-sm text-teal-700">
            ←
          </Link>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p>{item.description}</p>
        <div className="mt-2 flex gap-2">
          <Badge variant="outline">{item.category}</Badge>
          <Badge>{item.condition}</Badge>
          <Badge variant="warning">{item.city}</Badge>
        </div>
        {uid && item.status === 'available' ? (
          <button
            type="button"
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-white"
            onClick={() => setReserved(true)}
          >
            Reserve (דמה)
          </button>
        ) : null}
        {reserved ? <p className="mt-2 text-emerald-700">שמור ל-{uid?.slice(0, 8)}…</p> : null}
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold">בקשת משלוח</h3>
          {req ? (
            <p className="text-sm">
              סטטוס: <Badge>{req.status}</Badge> — {req.message}
            </p>
          ) : (
            <p className="text-sm text-slate-500">אין בקשה פעילה.</p>
          )}
        </div>
      </div>
    </div>
  )
}
