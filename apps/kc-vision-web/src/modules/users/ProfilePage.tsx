import { Link } from 'react-router-dom'
import { Building2, ChevronRight, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import {
  getActingUserId,
  usePersonaStore,
} from '../../store/personaStore'
import { visionUserById, visionOrganizationById } from './fixtures'
import { visionDirectReports } from './fixtures'
import { hasAnyRole } from '../../lib/roles'

export function ProfilePage() {
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const user = uid ? visionUserById(uid) : undefined
  const org = user?.organization_id
    ? visionOrganizationById(user.organization_id)
    : undefined

  if (!user) {
    return <p className="text-slate-600">אורח — אין פרופיל מלא. התחברו מדף הכניסה.</p>
  }

  const reports = visionDirectReports(user.id)
  const showVolunteerSnippet = hasAnyRole(user.roles, ['volunteer_manager'])
  const showOperatorLink = hasAnyRole(user.roles, ['operator'])
  const showOrg = hasAnyRole(user.roles, ['org_admin'])

  return (
    <div>
      <PageHeader title="פרופיל" subtitle="§2.2.6 — התאמה לפי תפקיד" />
      <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 md:flex-row">
        <Avatar src={user.avatar_url} alt="" size="lg" className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            <h2 className="text-xl font-bold">{user.name}</h2>
            {user.roles.map((r) => (
              <Badge key={r} variant="outline">
                {r}
              </Badge>
            ))}
          </div>
          <p className="text-slate-600">{user.bio}</p>
          <p className="text-sm text-slate-500">
            {user.city} · נקודות קארמה {user.karma_points}
          </p>
          {showOrg && org ? (
            <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
              <Building2 className="h-5 w-5 shrink-0 text-teal-800" />
              <div>
                <p className="font-semibold text-teal-900">{org.short_name ?? org.name}</p>
                <p className="text-teal-800">{user.organization_title}</p>
              </div>
            </div>
          ) : null}
          {showVolunteerSnippet ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="flex items-center gap-2 font-semibold text-slate-800">
                <Users className="h-4 w-4" /> המתנדבים שלי (דוח ישיר)
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {reports.map((v) => (
                  <li key={v.id}>
                    <Link className="text-teal-700 hover:underline" to={`/user/${v.id}`}>
                      {v.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {showOperatorLink ? (
            <Link
              to="/donations/shiduchim-tov/queue"
              className="inline-flex items-center gap-1 text-teal-700 hover:underline"
            >
              מעבר לתור התאמה (אופרטור) <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
