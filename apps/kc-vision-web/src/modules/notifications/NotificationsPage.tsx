import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { useNotificationStore } from '../../store/notificationStore'
import {
  getActingUserId,
  usePersonaStore,
} from '../../store/personaStore'

export function NotificationsPage() {
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const items = useNotificationStore((s) => s.items)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllReadForUser = useNotificationStore((s) => s.markAllReadForUser)

  if (!uid) return <p>התחברו להתראות.</p>

  const mine = items.filter((n) => n.user_id === uid)

  return (
    <div>
      <PageHeader
        title="התראות"
        subtitle="כולל סוגי אופרטור"
        action={
          <button
            type="button"
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={() => markAllReadForUser(uid)}
          >
            סמן הכל נקרא
          </button>
        }
      />
      <ul className="space-y-2">
        {mine.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border p-4 ${n.read ? 'border-slate-200 bg-white' : 'border-teal-300 bg-teal-50'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-slate-600">{n.body}</p>
              </div>
              <Badge variant="outline">{n.type}</Badge>
            </div>
            {!n.read ? (
              <button
                type="button"
                className="mt-2 text-sm text-teal-700 underline"
                onClick={() => markRead(n.id)}
              >
                סמן נקרא
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
