/**
 * Vision prototype user/org models — aligned with SRS §2.2 / §6.1 (shape subset for fixtures).
 * Not an API contract; used for static mocks only.
 */

export type VisionUserRole =
  | 'user'
  | 'volunteer'
  | 'volunteer_manager'
  | 'operator'
  | 'admin'
  | 'org_admin'
  | 'super_admin'

export type VisionOrgStatus = 'pending' | 'active' | 'suspended'

export type VisionOrgType = 'ngo' | 'community_center' | 'internal_unit'

export interface VisionUserSettings {
  language: 'he' | 'en'
  dark_mode: boolean
  notifications_enabled: boolean
  privacy: 'public' | 'followers' | 'private'
  /** Profile UI hints per §2.2.6 */
  profile_default_tab?: 'about' | 'activity' | 'volunteering' | 'org'
  profile_hidden_sections?: string[]
}

export interface VisionOrganization {
  id: string
  name: string
  short_name?: string
  description: string
  logo_url?: string
  website?: string
  contact_email: string
  phone: string
  address: string
  city: string
  country: string
  type: VisionOrgType
  status: VisionOrgStatus
  created_by_user_id: string
  /** Rough member count for badges in vision UI */
  affiliated_volunteers_count: number
}

export interface VisionUser {
  id: string
  email: string
  name: string
  phone: string
  avatar_url: string
  bio: string
  karma_points: number
  join_date: string
  is_active: boolean
  last_active: string
  city: string
  country: string
  interests: string[]
  roles: VisionUserRole[]
  posts_count: number
  followers_count: number
  following_count: number
  total_donations_amount: number
  total_volunteer_hours: number
  email_verified: boolean
  settings: VisionUserSettings
  parent_manager_id: string | null
  /** Optional formal org link §2.2.5 */
  organization_id: string | null
  /** Org-scoped job title for vision storytelling */
  organization_title?: string
}
