import { Flame, Smile } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import type { VisionPersonalChallenge } from '../../fixtures/challenges.fixtures'

const CATEGORY_LABEL: Record<VisionPersonalChallenge['category'], string> = {
  health: 'בריאות',
  environment: 'סביבה',
  kindness: 'נתינה',
  learning: 'לימוד',
  mindfulness: 'מודעות',
}

export function PersonalChallengeCard({
  challenge,
}: {
  challenge: VisionPersonalChallenge
}) {
  const next = new Date(challenge.next_check_in_at)
  const checkInLabel = next.toLocaleString('he-IL', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{challenge.title}</h3>
          {challenge.description ? (
            <p className="mt-1 text-sm text-slate-600">{challenge.description}</p>
          ) : null}
        </div>
        <Badge variant="outline">{CATEGORY_LABEL[challenge.category]}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-orange-800">
          <Flame className="h-4 w-4" />
          <span className="font-semibold">{challenge.streak_current}</span>
          <span className="text-xs text-orange-700">רצף נוכחי</span>
        </div>
        <div className="text-xs text-slate-500">
          שיא אישי: <strong>{challenge.streak_longest}</strong>
        </div>
      </div>

      {challenge.last_reset_mood ? (
        <div className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-900">
          <div className="flex items-center gap-1 font-semibold">
            <Smile className="h-3.5 w-3.5" /> דיווח אחרון בשבירת רצף:
            {' '}
            {challenge.last_reset_mood}/5
          </div>
          {challenge.last_reset_reason ? (
            <p className="mt-0.5">{challenge.last_reset_reason}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>הצ&apos;ק-אין הבא: {checkInLabel}</span>
        <button
          type="button"
          className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white"
        >
          דווח עכשיו (דמה)
        </button>
      </div>
    </div>
  )
}
