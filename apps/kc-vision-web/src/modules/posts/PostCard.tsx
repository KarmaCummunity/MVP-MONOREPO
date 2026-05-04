import { Lock, MessageCircle, ThumbsUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { visionUserById } from '../users/fixtures'
import type { VisionPost } from '../../fixtures/posts.fixtures'
import { usePersonaStore, getActingUserId, getRolesForPreset } from '../../store/personaStore'
import { useFeedStore } from '../../store/feedStore'
import { hasAnyRole } from '../../lib/roles'

function anonymityLabel(level: number, lang: string) {
  if (lang.startsWith('he')) {
    return ['', 'אופרטורים בלבד', 'אופרטורים+עוקבים', 'ציבורי מצומצם', 'ציבורי מלא'][
      level
    ]
  }
  return ['', 'Operators only', 'Ops+followers', 'Public limited', 'Full public'][
    level
  ]
}

export function PostCard({ post }: { post: VisionPost }) {
  const { i18n } = useTranslation()
  const author = visionUserById(post.author_id)
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const roles = getRolesForPreset(preset)
  const toggleLike = useFeedStore((s) => s.toggleLike)
  const toggleHide = useFeedStore((s) => s.setHidden)

  const displayName =
    post.anonymity_level === 3
      ? i18n.language.startsWith('he')
        ? 'חבר/ת קהילה'
        : 'Community member'
      : post.anonymity_level === 2 && !hasAnyRole(roles, ['operator', 'admin', 'super_admin'])
        ? author
          ? `${author.name.split(' ')[0] ?? ''} ${(author.name.split(' ')[1]?.[0] ?? '')}.`.trim() ||
            '—'
          : '—'
        : author?.name ?? '—'

  const avatar =
    post.anonymity_level >= 3 && post.anonymity_level !== 4
      ? 'https://api.dicebear.com/7.x/identicon/svg?seed=anon'
      : author?.avatar_url ?? ''

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar src={avatar} alt="" size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{displayName}</span>
            <Badge
              variant={post.intent === 'give' ? 'success' : 'warning'}
              className="capitalize"
            >
              {post.intent === 'give' ? 'Give / לתת' : 'Request / לקבל'}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              L{post.anonymity_level} — {anonymityLabel(post.anonymity_level, i18n.language)}
            </Badge>
            {post.hidden ? <Badge variant="danger">מוסתר</Badge> : null}
          </div>
          <h3 className="mt-2 font-semibold text-slate-800">{post.title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{post.body}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-teal-700"
              onClick={() => toggleLike(post.id, uid)}
              disabled={!uid}
            >
              <ThumbsUp className="h-4 w-4" />
              {post.likes_count}
            </button>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {post.comments_count}
            </span>
            {hasAnyRole(roles, ['admin', 'super_admin']) ? (
              <button
                type="button"
                className="text-amber-700 hover:underline"
                onClick={() => toggleHide(post.id, !post.hidden)}
              >
                {post.hidden ? 'הצג' : 'הסתר'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
