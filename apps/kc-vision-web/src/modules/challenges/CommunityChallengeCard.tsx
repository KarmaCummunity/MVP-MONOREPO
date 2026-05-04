import { Users } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import type { VisionCommunityChallenge } from '../../fixtures/challenges.fixtures'

const DIFFICULTY_TONE: Record<VisionCommunityChallenge['difficulty'], string> = {
  easy: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  hard: 'bg-orange-100 text-orange-800',
  expert: 'bg-rose-100 text-rose-800',
}

export function CommunityChallengeCard({
  challenge,
}: {
  challenge: VisionCommunityChallenge
}) {
  const progressPct = Math.min(
    100,
    Math.round((challenge.collective_progress / challenge.goal_target) * 100),
  )
  const ends = new Date(challenge.ends_at)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{challenge.title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_TONE[challenge.difficulty]}`}
        >
          {challenge.difficulty}
        </span>
      </div>
      <p className="text-sm text-slate-600">{challenge.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">{challenge.type}</Badge>
        <Badge>{challenge.frequency}</Badge>
        <Badge variant="outline">{challenge.category}</Badge>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
          <span>
            {challenge.collective_progress.toLocaleString('he-IL')} /{' '}
            {challenge.goal_target.toLocaleString('he-IL')}{' '}
            {challenge.goal_unit}
          </span>
          <span className="font-semibold text-teal-700">{progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-teal-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>{challenge.participants.toLocaleString('he-IL')} משתתפים</span>
        </div>
        <span>מסתיים {ends.toLocaleDateString('he-IL')}</span>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
      >
        הצטרפות לאתגר (דמה)
      </button>
    </div>
  )
}
