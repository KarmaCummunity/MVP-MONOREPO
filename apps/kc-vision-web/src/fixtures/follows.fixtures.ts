/** follower_id follows following_id — POC fake follow graph (PRD §3.10). */
export const VISION_FOLLOWS: Array<{ follower_id: string; following_id: string }> =
  [
    {
      follower_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
      following_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    },
    {
      follower_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
      following_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    },
    {
      follower_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
      following_id: 'user-19',
    },
    {
      follower_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
      following_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    },
    {
      follower_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
      following_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    },
    {
      follower_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
      following_id: 'user-13',
    },
    {
      follower_id: 'user-61bb90ee-3c22-4d50-a401-vol-david',
      following_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    },
    {
      follower_id: 'user-61bb90ee-3c22-4d50-a401-vol-david',
      following_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    },
    {
      follower_id: 'user-90219876-aabb-ccdd-student-tomer',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-90219876-aabb-ccdd-student-tomer',
      following_id: 'user-15',
    },
    {
      follower_id: 'user-77223344-5566-7788-senior-rivka',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-77223344-5566-7788-senior-rivka',
      following_id: 'user-19',
    },
    {
      follower_id: 'user-13',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-13',
      following_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    },
    {
      follower_id: 'user-15',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-15',
      following_id: 'user-77223344-5566-7788-senior-rivka',
    },
    {
      follower_id: 'user-19',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-20',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-11',
      following_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    },
    {
      follower_id: 'user-12',
      following_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    },
    {
      follower_id: 'user-14',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-16',
      following_id: 'user-77223344-5566-7788-senior-rivka',
    },
    {
      follower_id: 'user-17',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
    {
      follower_id: 'user-10',
      following_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    },
  ]

export function isFollower(
  viewerId: string | null,
  authorId: string,
): boolean {
  if (!viewerId) return false
  return VISION_FOLLOWS.some(
    (f) => f.follower_id === viewerId && f.following_id === authorId,
  )
}
