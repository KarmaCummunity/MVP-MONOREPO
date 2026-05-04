import type { VisionUserRole } from '../modules/users/types'

export function hasAnyRole(
  userRoles: VisionUserRole[] | undefined,
  allowed: VisionUserRole[],
): boolean {
  if (!userRoles?.length) return false
  return userRoles.some((r) => allowed.includes(r))
}

export function canAccessAdmin(roles: VisionUserRole[] | undefined): boolean {
  return hasAnyRole(roles, ['admin', 'super_admin'])
}

export function canAccessOperatorWorkspace(
  roles: VisionUserRole[] | undefined,
): boolean {
  return hasAnyRole(roles, ['operator', 'admin', 'super_admin'])
}
