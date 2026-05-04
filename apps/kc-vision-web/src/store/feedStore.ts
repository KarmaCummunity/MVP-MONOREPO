import { create } from 'zustand'
import {
  VISION_POSTS,
  type VisionPost,
} from '../fixtures/posts.fixtures'

interface FeedState {
  posts: VisionPost[]
  addPost: (p: VisionPost) => void
  toggleLike: (postId: string, viewerId: string | null) => void
  setHidden: (postId: string, hidden: boolean) => void
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [...VISION_POSTS],
  addPost: (p) => set({ posts: [p, ...get().posts] }),
  toggleLike: (postId, viewerId) => {
    if (!viewerId) return
    set({
      posts: get().posts.map((p) =>
        p.id === postId
          ? { ...p, likes_count: p.likes_count + 1 }
          : p,
      ),
    })
  },
  setHidden: (postId, hidden) =>
    set({
      posts: get().posts.map((p) =>
        p.id === postId ? { ...p, hidden } : p,
      ),
    }),
}))
