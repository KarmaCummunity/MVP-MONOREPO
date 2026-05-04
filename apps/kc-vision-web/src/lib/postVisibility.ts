import type { VisionUserRole } from '../modules/users/types'
import type { VisionPost } from '../fixtures/posts.fixtures'
import { hasAnyRole } from './roles'

export function canViewPostInFeed(options: {
  post: VisionPost
  viewerUserId: string | null
  viewerRoles: VisionUserRole[]
  isFollowerOfAuthor: boolean
  isGuest: boolean
}): boolean {
  const { post, viewerUserId, viewerRoles, isFollowerOfAuthor, isGuest } =
    options

  if (viewerUserId && post.author_id === viewerUserId) return true

  if (post.hidden && !hasAnyRole(viewerRoles, ['admin', 'super_admin']))
    return false

  const lv = post.anonymity_level

  if (lv === 4 || lv === 3) {
    if (isGuest) return true
    return true
  }

  if (lv === 2) {
    if (isGuest) return false
    if (
      hasAnyRole(viewerRoles, ['operator', 'admin', 'super_admin'])
    )
      return true
    return isFollowerOfAuthor
  }

  if (lv === 1) {
    return hasAnyRole(viewerRoles, ['operator', 'admin', 'super_admin'])
  }

  return false
}
