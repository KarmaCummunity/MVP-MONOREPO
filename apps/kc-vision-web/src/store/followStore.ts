import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { VISION_FOLLOWS } from '../fixtures/follows.fixtures'

function key(a: string, b: string) {
  return `${a}|${b}`
}

const initial = new Set(
  VISION_FOLLOWS.map((f) => key(f.follower_id, f.following_id)),
)

interface FollowState {
  /** serialized Set in persist */
  pairs: string[]
  follow: (followerId: string, followingId: string) => void
  unfollow: (followerId: string, followingId: string) => void
  isFollowing: (followerId: string, followingId: string) => boolean
}

export const useFollowStore = create<FollowState>()(
  persist(
    (set, get) => ({
      pairs: [...initial],
      follow: (followerId, followingId) =>
        set((s) => {
          const n = new Set(s.pairs)
          n.add(key(followerId, followingId))
          return { pairs: [...n] }
        }),
      unfollow: (followerId, followingId) =>
        set((s) => ({
          pairs: s.pairs.filter((p) => p !== key(followerId, followingId)),
        })),
      isFollowing: (followerId, followingId) =>
        get().pairs.includes(key(followerId, followingId)),
    }),
    { name: 'kc-vision-follows' },
  ),
)
