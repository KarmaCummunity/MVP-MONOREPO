import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  BookOpen,
  Building2,
  Car,
  GraduationCap,
  HeartHandshake,
  MessageSquare,
  Trophy,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { EmptyState } from '../../components/ui/EmptyState'
import { Badge } from '../../components/ui/Badge'
import {
  VISION_BOOKMARKS,
  type BookmarkKind,
  type VisionBookmark,
} from '../../fixtures/bookmarks.fixtures'
import {
  getActingUserId,
  usePersonaStore,
} from '../../store/personaStore'

type FilterKind = 'all' | BookmarkKind

const FILTER_LABELS: Record<FilterKind, string> = {
  all: 'הכול',
  post: 'פוסטים',
  ride: 'נסיעות',
  item: 'חפצים',
  challenge: 'אתגרים',
  course: 'קורסים',
  organization: 'עמותות',
}

const KIND_ICON = {
  post: MessageSquare,
  ride: Car,
  item: HeartHandshake,
  challenge: Trophy,
  course: GraduationCap,
  organization: Building2,
} as const

export function BookmarksPage() {
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const [filter, setFilter] = useState<FilterKind>('all')
  const [removed, setRemoved] = useState<string[]>([])

  const mine: VisionBookmark[] = useMemo(() => {
    if (!uid) return []
    return VISION_BOOKMARKS.filter((b) => b.user_id === uid && !removed.includes(b.id))
  }, [uid, removed])

  const filtered = useMemo(() => {
    if (filter === 'all') return mine
    return mine.filter((b) => b.kind === filter)
  }, [mine, filter])

  if (!uid) {
    return (
      <div>
        <PageHeader title="מועדפים" subtitle="§3.13" />
        <EmptyState
          icon={Bookmark}
          title="אורח — אין פריטים שמורים"
          description="התחברו כדי לסמן פוסטים, נסיעות, חפצים ואתגרים שתרצו לחזור אליהם."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="מועדפים"
        subtitle="§3.13 — פריטים ששמרת לצפייה מהירה"
      />
      <Tabs
        tabs={(['all', 'post', 'ride', 'item', 'challenge', 'course', 'organization'] as FilterKind[]).map(
          (id) => ({ id, label: FILTER_LABELS[id] }),
        )}
        value={filter}
        onChange={(t) => setFilter(t as FilterKind)}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState
              icon={Bookmark}
              title="אין פריטים בקטגוריה זו"
              description="כשתסמן פריט בכוכב — הוא יופיע כאן."
            />
          </div>
        ) : (
          filtered.map((b) => {
            const Icon = KIND_ICON[b.kind] ?? BookOpen
            return (
              <Link
                key={b.id}
                to={b.link}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-500 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <Icon className="h-5 w-5 text-teal-700" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{b.title}</p>
                    <Badge variant="outline">{FILTER_LABELS[b.kind]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{b.subtitle}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      נשמר: {new Date(b.saved_at).toLocaleDateString('he-IL')}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setRemoved((r) => [...r, b.id])
                      }}
                      className="text-xs text-rose-700 underline opacity-0 transition group-hover:opacity-100"
                    >
                      הסר מהשמורים
                    </button>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
