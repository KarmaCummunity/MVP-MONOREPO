import { useParams } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { visionUserById } from './fixtures'
import {
  getActingUserId,
  usePersonaStore,
} from '../../store/personaStore'
import { useFollowStore } from '../../store/followStore'

export function UserPublicPage() {
  const { userId } = useParams()
  const user = userId ? visionUserById(userId) : undefined
  const preset = usePersonaStore((s) => s.preset)
  const me = getActingUserId(preset)
  const follow = useFollowStore((s) => s.follow)
  const unfollow = useFollowStore((s) => s.unfollow)
  const isFollowing = useFollowStore((s) => s.isFollowing)

  if (!user) return <p className="text-slate-500">לא נמצא.</p>

  const canFollow = me && me !== user.id
  const following = me ? isFollowing(me, user.id) : false

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <Avatar src={user.avatar_url} alt="" size="lg" />
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1">
              {user.roles.map((r) => (
                <Badge key={r} variant="outline">
                  {r}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-slate-600">{user.bio}</p>
          </div>
        </div>
        {canFollow ? (
          <button
            type="button"
            className={
              following
                ? 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm'
                : 'rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white'
            }
            onClick={() =>
              following ? unfollow(me, user.id) : follow(me, user.id)
            }
          >
            {following ? 'ביטול עוקב' : 'עקוב'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
