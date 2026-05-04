import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { VISION_USERS } from './fixtures/users.fixtures'

export function DiscoverPage() {
  return (
    <div>
      <PageHeader title="גילוי אנשים" subtitle="§2.2.2 — עוקבים (דמה)" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {VISION_USERS.map((u) => (
          <li key={u.id}>
            <Link
              to={`/user/${u.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-400"
            >
              <Avatar src={u.avatar_url} alt="" />
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-xs text-slate-500">{u.city}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
