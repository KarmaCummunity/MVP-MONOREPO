import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Building2,
  Coins,
  HeartHandshake,
  ListChecks,
  TrendingUp,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { RequireRole } from '../../components/RequireRole'
import {
  VISION_ADMIN_TASKS,
  VISION_FINANCE_SUMMARY,
} from '../../fixtures/admin.fixtures'
import { VISION_USERS } from '../../modules/users/fixtures/users.fixtures'
import {
  getActingUserId,
  usePersonaStore,
} from '../../store/personaStore'
import { visionUserById, visionOrganizationById } from '../users/fixtures'

interface MetricCardProps {
  icon: typeof Users
  label: string
  value: string
  trend?: string
  variant?: 'positive' | 'neutral' | 'negative'
}

function MetricCard({ icon: Icon, label, value, trend, variant = 'neutral' }: MetricCardProps) {
  const trendCls =
    variant === 'positive'
      ? 'text-emerald-700'
      : variant === 'negative'
        ? 'text-rose-700'
        : 'text-slate-500'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {trend ? (
        <p className={`mt-1 text-xs font-medium ${trendCls}`}>{trend}</p>
      ) : null}
    </div>
  )
}

export function OrgDashboardPage() {
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const user = uid ? visionUserById(uid) : undefined
  const org = user?.organization_id
    ? visionOrganizationById(user.organization_id)
    : undefined

  const orgVolunteers = useMemo(() => {
    if (!org) return []
    return VISION_USERS.filter((u) => u.organization_id === org.id)
  }, [org])

  const tasks = VISION_ADMIN_TASKS
  const fin = VISION_FINANCE_SUMMARY

  return (
    <RequireRole allow={['org_admin', 'admin', 'super_admin']}>
      <div>
        <PageHeader
          title="לוח בקרה ארגוני"
          subtitle="§3.11 — סיכום פעילות, צוות, משימות וכספים"
        />

        {!org ? (
          <EmptyState
            icon={Building2}
            title="אין שיוך לארגון"
            description="הפרסונה הנוכחית אינה משויכת לארגון פעיל. החליפו לפרסונת מנהל ארגון מהכפתור בכותרת."
          />
        ) : (
          <>
            <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-teal-800">ארגון פעיל</p>
                  <h2 className="text-xl font-bold text-teal-900">{org.name}</h2>
                  <p className="text-xs text-teal-700">
                    {org.city} · {org.contact_email}
                  </p>
                </div>
                <Badge variant="success">פעיל · מנוי בתשלום</Badge>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={Users}
                label="מתנדבים פעילים"
                value={`${org.affiliated_volunteers_count}`}
                trend="+4 השבוע"
                variant="positive"
              />
              <MetricCard
                icon={HeartHandshake}
                label="פעולות מקושרות החודש"
                value="184"
                trend="+22% מול חודש שעבר"
                variant="positive"
              />
              <MetricCard
                icon={Coins}
                label="תרומות YTD"
                value={`${fin.ytd_donations.toLocaleString('he-IL')} ₪`}
                trend={`${(fin.ytd_donations - fin.ytd_expenses).toLocaleString('he-IL')} ₪ הוצאות נטו`}
                variant="neutral"
              />
              <MetricCard
                icon={TrendingUp}
                label="תורמים חוזרים"
                value={`${fin.active_recurring_donors}`}
                trend={`${fin.one_time_donors} חד-פעמיים`}
                variant="neutral"
              />
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold">מגמת תרומות חודשית</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fin.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="donations_in"
                        stroke="#0d9488"
                        strokeWidth={2}
                        name="תרומות נכנסות"
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses_out"
                        stroke="#f97316"
                        strokeWidth={2}
                        name="הוצאות"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-sm font-semibold">תורמים פעילים — חודשיים</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fin.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="active_donors" fill="#6366f1" name="תורמים" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-teal-700" />
                  <h3 className="font-semibold">משימות פעילות</h3>
                </div>
                <ul className="space-y-2 text-sm">
                  {tasks.slice(0, 5).map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <p className="text-xs text-slate-500">
                          {task.assignees.join(', ')}
                          {task.due_date ? ` · עד ${task.due_date}` : null}
                        </p>
                      </div>
                      <Badge
                        variant={
                          task.status === 'done'
                            ? 'success'
                            : task.status === 'blocked'
                              ? 'danger'
                              : task.priority === 'urgent'
                                ? 'warning'
                                : 'outline'
                        }
                      >
                        {task.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-700" />
                  <h3 className="font-semibold">צוות הארגון</h3>
                </div>
                {orgVolunteers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    עדיין אין מתנדבים משויכים — אפשר לאשר בקשות חדשות מהמסך "ניהול".
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {orgVolunteers.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{v.name}</p>
                          <p className="text-xs text-slate-500">
                            {v.organization_title ?? '—'} · {v.city}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {v.total_volunteer_hours} שעות
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </RequireRole>
  )
}
