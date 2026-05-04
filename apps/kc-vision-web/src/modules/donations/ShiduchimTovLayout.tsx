import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { canAccessOperatorWorkspace } from '../../lib/roles'
import { getRolesForPreset, usePersonaStore } from '../../store/personaStore'

const sub =
  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors'

export function ShiduchimTovLayout() {
  const preset = usePersonaStore((s) => s.preset)
  const roles = getRolesForPreset(preset)
  const showOp = canAccessOperatorWorkspace(roles)

  return (
    <div className="space-y-4">
      {showOp ? (
        <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
          <NavLink
            to="/donations/shiduchim-tov/queue"
            className={({ isActive }: { isActive: boolean }) =>
              cn(sub, isActive ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100')
            }
          >
            תור
          </NavLink>
          <NavLink
            to="/donations/shiduchim-tov/cases"
            className={({ isActive }: { isActive: boolean }) =>
              cn(sub, isActive ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-100')
            }
          >
            מקרים
          </NavLink>
        </nav>
      ) : null}
      <Outlet />
    </div>
  )
}
