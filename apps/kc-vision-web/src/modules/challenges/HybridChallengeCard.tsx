import { CheckCircle2, MessageCircle } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import type { VisionHybridChallenge } from '../../fixtures/challenges.fixtures'

export function HybridChallengeCard({
  challenge,
}: {
  challenge: VisionHybridChallenge
}) {
  const checkinPct = Math.round(
    (challenge.today_checked_in / challenge.members_count) * 100,
  )

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {challenge.title}
          </h3>
          <p className="text-sm text-slate-600">{challenge.description}</p>
        </div>
        <Badge variant={challenge.visibility === 'private' ? 'warning' : 'success'}>
          {challenge.visibility === 'private' ? 'פרטי' : 'ציבורי'}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <div className="rounded-lg bg-teal-50 px-3 py-1.5 text-teal-800">
          <strong>{challenge.members_count.toLocaleString('he-IL')}</strong>{' '}
          חברים
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-800">
          <strong>{challenge.today_checked_in.toLocaleString('he-IL')}</strong>{' '}
          דיווחו היום
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-slate-700">
          {checkinPct}% מהקבוצה פעילים היום
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5" /> דיווחים אחרונים
        </div>
        <ul className="space-y-2">
          {challenge.recent_check_ins.map((c) => (
            <li key={`${c.user_id}-${c.at}`} className="flex items-start gap-2">
              <Avatar
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.user_name)}`}
                alt=""
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-900">
                    {c.user_name}
                  </p>
                  <span className="text-xs text-slate-400">
                    {new Date(c.at).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {c.note ? (
                  <p className="text-xs text-slate-600">{c.note}</p>
                ) : (
                  <p className="text-xs text-slate-400">— צ&apos;ק-אין שקט —</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          דווח &quot;קמתי&quot; (דמה)
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <MessageCircle className="h-4 w-4" /> צ&apos;אט קבוצתי
        </button>
      </div>
    </div>
  )
}
