import type { VisionOrganization, VisionUser } from '../types'
import { VISION_ORGANIZATIONS } from './organizations.fixtures'
import { VISION_USERS } from './users.fixtures'

export { VISION_ORGANIZATIONS } from './organizations.fixtures'
export { VISION_USERS } from './users.fixtures'

export function visionUserById(id: string): VisionUser | undefined {
  return VISION_USERS.find((u) => u.id === id)
}

export function visionOrganizationById(id: string): VisionOrganization | undefined {
  return VISION_ORGANIZATIONS.find((o) => o.id === id)
}

export function visionUsersByOrganizationId(organizationId: string): VisionUser[] {
  return VISION_USERS.filter((u) => u.organization_id === organizationId)
}

export function visionDirectReports(managerId: string): VisionUser[] {
  return VISION_USERS.filter((u) => u.parent_manager_id === managerId)
}
