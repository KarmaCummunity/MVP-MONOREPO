import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { useFeedStore } from '../../store/feedStore'
import {
  getActingUserId,
  getRolesForPreset,
  usePersonaStore,
} from '../../store/personaStore'
import { canViewPostInFeed } from '../../lib/postVisibility'
import { isFollower } from '../../fixtures/follows.fixtures'
import { useFollowStore } from '../../store/followStore'
import type { VisionPostType } from '../../fixtures/posts.fixtures'
import { PostCard } from './PostCard'

type SortKey = 'recent' | 'likes' | 'comments'

export function FeedPage() {
  const { t } = useTranslation()
  const posts = useFeedStore((s) => s.posts)
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const roles = getRolesForPreset(preset)
  const isGuest = preset === 'guest'
  const followPairs = useFollowStore((s) => s.pairs)

  const [filterType, setFilterType] = useState<VisionPostType | 'all'>('all')
  const [intent, setIntent] = useState<'all' | 'give' | 'request'>('all')
  const [sort, setSort] = useState<SortKey>('recent')

  const visible = useMemo(() => {
    return posts.filter((p) => {
      const followOk =
        isFollower(uid, p.author_id) ||
        (uid
          ? followPairs.includes(`${uid}|${p.author_id}`)
          : false)
      return canViewPostInFeed({
        post: p,
        viewerUserId: uid,
        viewerRoles: roles,
        isFollowerOfAuthor: followOk,
        isGuest,
      })
    })
  }, [posts, uid, roles, isGuest, followPairs])

  const filtered = useMemo(() => {
    let list = visible.filter((p) =>
      filterType === 'all' ? true : p.post_type === filterType,
    )
    list = list.filter((p) =>
      intent === 'all' ? true : p.intent === intent,
    )
    const sorted = [...list]
    if (sort === 'likes') sorted.sort((a, b) => b.likes_count - a.likes_count)
    else if (sort === 'comments')
      sorted.sort((a, b) => b.comments_count - a.comments_count)
    else sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    return sorted
  }, [visible, filterType, intent, sort])

  return (
    <div>
      <PageHeader title={t('nav.feed')} subtitle="פיד — סינון/מיון מקומי (§2.5.6)" />
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as VisionPostType | 'all')}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">כל הסוגים</option>
          <option value="regular">רגיל</option>
          <option value="donation_item">תרומה</option>
          <option value="ride">נסיעה</option>
          <option value="challenge">אתגר</option>
        </select>
        <select
          value={intent}
          onChange={(e) => setIntent(e.target.value as 'all' | 'give' | 'request')}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="all">Give + Request</option>
          <option value="give">Give</option>
          <option value="request">Request</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="recent">תאריך</option>
          <option value="likes">לייקים</option>
          <option value="comments">תגובות</option>
        </select>
      </div>
      <div className="flex flex-col gap-4">
        {filtered.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
        {filtered.length === 0 ? (
          <p className="text-slate-500">אין פוסטים להצגה לפרסונה הנוכחית.</p>
        ) : null}
      </div>
    </div>
  )
}
