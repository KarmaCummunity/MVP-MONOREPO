import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Coins, TrendingUp, Users } from 'lucide-react'
import { VISION_FINANCE_SUMMARY } from '../../../fixtures/admin.fixtures'

export function FinancePanel() {
  const f = VISION_FINANCE_SUMMARY
  const net = f.ytd_donations - f.ytd_expenses

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          icon={Coins}
          label="תרומות YTD"
          value={`${f.ytd_donations.toLocaleString('he-IL')} ₪`}
        />
        <Card
          icon={TrendingUp}
          label="הוצאות YTD"
          value={`${f.ytd_expenses.toLocaleString('he-IL')} ₪`}
        />
        <Card
          icon={Coins}
          label="רווח/יתרה נטו"
          value={`${net.toLocaleString('he-IL')} ₪`}
          tone={net >= 0 ? 'good' : 'bad'}
        />
        <Card
          icon={Users}
          label="תורמים פעילים"
          value={`${f.active_recurring_donors + f.one_time_donors}`}
          hint={`${f.active_recurring_donors} קבועים · ${f.one_time_donors} חד-פעמיים`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-slate-700">
          התרומה הגדולה ביותר השנה
        </p>
        <p className="text-2xl font-bold text-slate-900">
          {f.largest_donation.amount.toLocaleString('he-IL')} ₪
        </p>
        <p className="text-xs text-slate-500">
          תורם: {f.largest_donation.donor_display}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">הכנסות מול הוצאות (חודשי)</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={f.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="donations_in" fill="#0d9488" name="תרומות" />
              <Bar dataKey="expenses_out" fill="#f97316" name="הוצאות" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Card({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: typeof Coins
  label: string
  value: string
  hint?: string
  tone?: 'good' | 'bad' | 'neutral'
}) {
  const valCls =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'bad'
        ? 'text-rose-700'
        : 'text-slate-900'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-1 text-2xl font-bold ${valCls}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
