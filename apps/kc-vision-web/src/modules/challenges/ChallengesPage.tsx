import { useState } from 'react'
import { Flame, Plus, Sparkles, Sunrise, Trophy, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { Badge } from '../../components/ui/Badge'
import {
  VISION_PERSONAL_CHALLENGES,
  VISION_COMMUNITY_CHALLENGES,
  VISION_HYBRID_CHALLENGES,
  VISION_LEADERBOARD,
} from '../../fixtures/challenges.fixtures'
import { PersonalChallengeCard } from './PersonalChallengeCard'
import { CommunityChallengeCard } from './CommunityChallengeCard'
import { HybridChallengeCard } from './HybridChallengeCard'
import { LeaderboardList } from './LeaderboardList'

type TabId = 'personal' | 'community' | 'hybrid' | 'leaderboard'

export function ChallengesPage() {
  const [tab, setTab] = useState<TabId>('personal')

  return (
    <div>
      <PageHeader
        title="אתגרים"
        subtitle="§3.9 — הרגלים אישיים, יעדים קהילתיים ואתגרים שיתופיים"
        action={
          <button className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> צור אתגר חדש
          </button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SummaryCard
          icon={Flame}
          label="הרצף הכי ארוך שלך"
          value="47 ימים"
          hint="מדיטציה בוקר 10 דקות"
        />
        <SummaryCard
          icon={Trophy}
          label="מקום נוכחי בלוח המובילים"
          value="#3"
          hint="עברתי 1 מקומה השבוע"
        />
        <SummaryCard
          icon={Users}
          label="חברי הצוות שעוקבים אחריך"
          value="12"
          hint="מועדון 5 בבוקר"
        />
      </div>

      <Tabs
        tabs={[
          { id: 'personal', label: 'אישי' },
          { id: 'community', label: 'קהילתי' },
          { id: 'hybrid', label: 'שיתופי (היברידי)' },
          { id: 'leaderboard', label: 'לוח מובילים' },
        ]}
        value={tab}
        onChange={(t) => setTab(t as TabId)}
      />

      <div className="mt-4">
        {tab === 'personal' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {VISION_PERSONAL_CHALLENGES.map((c) => (
              <PersonalChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        ) : null}

        {tab === 'community' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {VISION_COMMUNITY_CHALLENGES.map((c) => (
              <CommunityChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        ) : null}

        {tab === 'hybrid' ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Sunrise className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="text-sm text-amber-900">
                אתגר שיתופי = הרגל אישי שמתבצע בתוך קבוצה ציבורית, עם צ&apos;אט קבוצתי
                ודיווח יומי. המשתתפים רואים זה את זה ועושים &quot;צ&apos;ק-אין&quot; הדדי.
              </div>
            </div>
            {VISION_HYBRID_CHALLENGES.map((c) => (
              <HybridChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        ) : null}

        {tab === 'leaderboard' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-700" />
              <h3 className="font-semibold">לוח מובילים — אתגרים פעילים</h3>
              <Badge variant="outline">7 ימים אחרונים</Badge>
            </div>
            <LeaderboardList entries={VISION_LEADERBOARD} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  )
}
