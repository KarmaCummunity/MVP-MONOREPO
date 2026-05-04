import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { VisionLeaderboardEntry } from '../../fixtures/challenges.fixtures'

export function LeaderboardList({
  entries,
}: {
  entries: VisionLeaderboardEntry[]
}) {
  return (
    <ol className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.user_id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                e.rank === 1
                  ? 'bg-amber-100 text-amber-900'
                  : e.rank === 2
                    ? 'bg-slate-200 text-slate-800'
                    : e.rank === 3
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-50 text-slate-600'
              }`}
            >
              #{e.rank}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{e.name}</p>
              <DeltaIndicator delta={e.delta_vs_last_week} />
            </div>
          </div>
          <span className="font-mono text-sm font-bold text-teal-800">
            {e.score.toLocaleString('he-IL')}
          </span>
        </li>
      ))}
    </ol>
  )
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Minus className="h-3 w-3" /> ללא שינוי
      </span>
    )
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-700">
        <ArrowUp className="h-3 w-3" /> +{delta} מקומות
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-rose-700">
      <ArrowDown className="h-3 w-3" /> {delta} מקומות
    </span>
  )
}
