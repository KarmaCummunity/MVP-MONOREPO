import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { VISION_CONVERSATIONS } from '../../fixtures/chat.fixtures'
import { getActingUserId, usePersonaStore } from '../../store/personaStore'
import { visionUserById } from '../users/fixtures'

export function ChatListPage() {
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  if (!uid) return <p>התחברו לצ'אט (לא אורח).</p>

  const mine = VISION_CONVERSATIONS.filter((c) => c.participant_ids.includes(uid))

  return (
    <div>
      <PageHeader title="צ'אט" subtitle="§2.7" />
      <ul className="space-y-2">
        {mine.map((c) => {
          const other = c.participant_ids.find((p) => p !== uid)
          const name = other ? visionUserById(other)?.name ?? 'משתמש' : '—'
          return (
            <li key={c.id}>
              <Link
                to={`/chat/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-teal-400"
              >
                <span className="font-medium">{name}</span>
                {c.unread_count > 0 ? (
                  <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">
                    {c.unread_count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
