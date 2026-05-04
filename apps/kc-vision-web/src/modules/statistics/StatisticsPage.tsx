import { useEffect, useState } from 'react'
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
import { PageHeader } from '../../components/ui/PageHeader'
import {
  VISION_CITY_STATS,
  VISION_COMMUNITY_STATS,
  VISION_STATS_TRENDS,
} from '../../fixtures/stats.fixtures'

export function StatisticsPage() {
  const [live, setLive] = useState(124)
  useEffect(() => {
    const id = window.setInterval(() => {
      setLive((n) => n + Math.floor(Math.random() * 3))
    }, 3000)
    return () => window.clearInterval(id)
  }, [])

  const s = VISION_COMMUNITY_STATS

  return (
    <div>
      <PageHeader title="סטטיסטיקה" subtitle="§2.10 — דמה + polling" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="משתמשים" value={s.total_users} />
        <StatCard label="תרומות (סכום)" value={s.total_donations_amount} />
        <StatCard label="נסיעות" value={s.total_rides} />
        <StatCard label="אתגרים פעילים" value={s.active_challenges} />
      </div>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          מדד חי (polling דמה): <strong>{live}</strong>
        </p>
      </div>
      <div className="mb-8 h-64 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">מגמות</p>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={VISION_STATS_TRENDS}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-64 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">לפי עיר</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={VISION_CITY_STATS}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="donations" fill="#14b8a6" name="תרומות" />
            <Bar dataKey="volunteers" fill="#6366f1" name="מתנדבים" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value.toLocaleString('he-IL')}</p>
    </div>
  )
}
