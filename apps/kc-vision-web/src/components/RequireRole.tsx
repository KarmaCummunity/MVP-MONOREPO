import { Navigate } from 'react-router-dom'
import {
  getActingUserId,
  getRolesForPreset,
  usePersonaStore,
} from '../store/personaStore'
import { hasAnyRole } from '../lib/roles'
import type { VisionUserRole } from '../modules/users/types'

export function RequireRole({
  allow,
  children,
}: {
  allow: VisionUserRole[]
  children: React.ReactNode
}) {
  const preset = usePersonaStore((s) => s.preset)
  const uid = getActingUserId(preset)
  const roles = getRolesForPreset(preset)

  if (preset === 'guest' || !uid) {
    return <Navigate to="/login" replace />
  }

  if (!hasAnyRole(roles, allow)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold text-amber-950">אין הרשאה לצפות במסך זה</p>
        <p className="mt-2 text-sm text-amber-900">
          החליפו פרסונה לאדמין או סופר־אדמין בתפריט העליון.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
