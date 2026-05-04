import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VisionUserRole } from '../modules/users/types'

/** Seven personas + guest — drives mock RBAC and sidebar (SRS §1.2). */
export type PersonaPreset =
  | 'guest'
  | 'community'
  | 'volunteer'
  | 'volunteer_manager'
  | 'operator'
  | 'org_admin'
  | 'admin'
  | 'super_admin'

/** Maps preset to a curated fixture user id (except guest). */
export const PERSONA_USER_IDS: Record<Exclude<PersonaPreset, 'guest'>, string> =
  {
    community: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    volunteer: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    volunteer_manager: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    operator: 'user-b203d4ae-6f10-4d8c-9e01-operator-michal',
    org_admin: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    admin: 'user-f109eeda-2b8c-4a11-9f12-admin-nadav',
    super_admin: 'user-11001100-1100-1100-1100-superadmin',
  }

export function getActingUserId(preset: PersonaPreset): string | null {
  if (preset === 'guest') return null
  return PERSONA_USER_IDS[preset]
}

/** Minimal roles for guest — no privileged routes. */
const GUEST_ROLES: VisionUserRole[] = []

export function getRolesForPreset(preset: PersonaPreset): VisionUserRole[] {
  if (preset === 'guest') return GUEST_ROLES
  switch (preset) {
    case 'community':
      return ['user']
    case 'volunteer':
      return ['volunteer', 'user']
    case 'volunteer_manager':
      return ['volunteer_manager', 'volunteer', 'user']
    case 'operator':
      return ['operator', 'user']
    case 'org_admin':
      return ['org_admin', 'volunteer', 'user']
    case 'admin':
      return ['admin', 'user']
    case 'super_admin':
      return ['super_admin', 'user']
    default:
      return ['user']
  }
}

interface PersonaState {
  preset: PersonaPreset
  setPreset: (p: PersonaPreset) => void
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      preset: 'community',
      setPreset: (preset) => set({ preset }),
    }),
    { name: 'kc-vision-persona' },
  ),
)
