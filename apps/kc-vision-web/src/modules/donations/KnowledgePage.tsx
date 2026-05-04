import { useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  PlayCircle,
  Star,
  UserCheck,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { Badge } from '../../components/ui/Badge'
import {
  VISION_KNOWLEDGE_ARTICLES,
  VISION_KNOWLEDGE_COURSES,
  VISION_KNOWLEDGE_PRIVATE_LESSONS,
  VISION_KNOWLEDGE_VIDEOS,
  type KnowledgeApprovalStatus,
} from '../../fixtures/knowledge.fixtures'

type TabId = 'courses' | 'private' | 'articles' | 'videos' | 'contribute'

const TAB_LABELS: Array<{ id: TabId; label: string }> = [
  { id: 'courses', label: 'קורסים דיגיטליים' },
  { id: 'private', label: 'שיעורים פרטיים' },
  { id: 'articles', label: 'מאמרים וטקסטים' },
  { id: 'videos', label: 'סרטונים וקישורים' },
  { id: 'contribute', label: 'תרום ידע' },
]

function StatusBadge({ status }: { status: KnowledgeApprovalStatus }) {
  if (status === 'approved') return <Badge variant="success">מאושר</Badge>
  if (status === 'pending_review')
    return <Badge variant="warning">בהמתנה לאישור הארגון</Badge>
  return <Badge variant="danger">נדחה</Badge>
}

export function KnowledgePage() {
  const [tab, setTab] = useState<TabId>('courses')
  const [contributeMsg, setContributeMsg] = useState('')

  return (
    <div>
      <PageHeader
        title="עולם הידע"
        subtitle="§3.5.2 — קורסים, שיעורים פרטיים, מאמרים וסרטונים. הכל חינם."
      />
      <Tabs<TabId> tabs={TAB_LABELS} value={tab} onChange={setTab} />

      <div className="mt-4">
        {tab === 'courses' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {VISION_KNOWLEDGE_COURSES.map((c) => (
              <div
                key={c.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div
                  className="flex h-24 items-center justify-center"
                  style={{ backgroundColor: c.thumbnail_color }}
                >
                  <GraduationCap className="h-10 w-10 text-white" />
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{c.title}</h3>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      <Star className="mr-1 inline h-3 w-3 text-amber-500" />
                      {c.rating.toFixed(1)}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {Math.round(c.total_minutes / 60)} שעות
                    </Badge>
                    <Badge variant="outline">{c.lessons.length} שיעורים</Badge>
                    <Badge variant="outline">{c.level}</Badge>
                    <Badge variant="outline">{c.enrolled_count} נרשמו</Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    מנחה: {c.instructor_name}
                  </p>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-teal-700">
                      תוכן הקורס ({c.lessons.length} שיעורים)
                    </summary>
                    <ol className="mt-2 list-decimal space-y-1 pe-4 text-slate-700">
                      {c.lessons.map((l) => (
                        <li key={l.id}>
                          {l.title}{' '}
                          <span className="text-xs text-slate-400">
                            · {l.duration_minutes} דק׳
                            {l.has_quiz ? ' · עם בוחן' : ''}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'private' ? (
          <div className="grid gap-3 md:grid-cols-2">
            {VISION_KNOWLEDGE_PRIVATE_LESSONS.map((l) => (
              <div
                key={l.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{l.title}</h3>
                  <StatusBadge status={l.status} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {l.topic} · {l.city} ·{' '}
                  {l.format === 'remote'
                    ? 'מקוון'
                    : l.format === 'in_person'
                      ? 'פנים אל פנים'
                      : 'משולב'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  מחנך/ת: {l.teacher_name}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge variant="outline">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {l.duration_minutes} דק׳
                  </Badge>
                  <Badge variant="outline">
                    <UserCheck className="mr-1 inline h-3 w-3" />
                    {l.weekly_slots} סלוטים בשבוע
                  </Badge>
                  <Badge variant="outline">
                    <Star className="mr-1 inline h-3 w-3 text-amber-500" />
                    {l.rating.toFixed(1)}
                  </Badge>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white"
                >
                  בקש שיעור (דמה)
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'articles' ? (
          <ul className="space-y-3">
            {VISION_KNOWLEDGE_ARTICLES.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <BookOpen className="mt-0.5 h-5 w-5 text-teal-700" />
                    <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{a.excerpt}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{a.author_name}</span>
                  <span>· {a.reading_minutes} דק׳ קריאה</span>
                  <Badge variant="outline">{a.category}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === 'videos' ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {VISION_KNOWLEDGE_VIDEOS.map((v) => (
              <li
                key={v.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                    <PlayCircle className="h-7 w-7 text-rose-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {v.title}
                      </h3>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{v.source}</Badge>
                      <Badge variant="outline">{v.duration}</Badge>
                      <Badge variant="outline">{v.category}</Badge>
                      <Badge variant="outline">
                        {v.views.toLocaleString('he-IL')} צפיות
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      הוגש על ידי {v.submitted_by_name}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === 'contribute' ? (
          <form
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault()
              setContributeMsg('')
              alert('דמה: בקשת תרומת ידע נשלחה לאישור הנהלת הארגון.')
            }}
          >
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-700" />
              <p>
                כל תרומת ידע (קורס/שיעור/טקסט/סרטון) דורשת אישור מראש מהנהלת
                הארגון. האישור מבטיח איכות ובטיחות תוכן לקהילה.
              </p>
            </div>
            <label className="block text-sm">
              סוג תרומה
              <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                <option>קורס דיגיטלי</option>
                <option>שיעור פרטי 1:1</option>
                <option>מאמר/טקסט</option>
                <option>סרטון או קישור חיצוני</option>
              </select>
            </label>
            <label className="block text-sm">
              קטגוריה ראשית
              <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                <option>חינוך</option>
                <option>טכנולוגיה</option>
                <option>בריאות</option>
                <option>שפות</option>
                <option>אמנות ועיצוב</option>
              </select>
            </label>
            <label className="block text-sm">
              תיאור הצעה (1-2 משפטים)
              <textarea
                value={contributeMsg}
                onChange={(e) => setContributeMsg(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="למשל: קורס מבוא ל-AI לבני נוער, 6 שיעורים..."
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white"
            >
              שלח לאישור (דמה)
            </button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
