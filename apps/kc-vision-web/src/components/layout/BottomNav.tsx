import { NavLink } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  Car,
  Gift,
  HeartHandshake,
  LayoutGrid,
  Link2,
  MessageCircle,
  RefreshCw,
  Shield,
  Trophy,
  UserCircle,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import {
  getActingUserId,
  getRolesForPreset,
  usePersonaStore,
} from '../../store/personaStore'
import { canAccessAdmin, canAccessOperatorWorkspace } from '../../lib/roles'

type TabItem = {
  to: string
  icon: typeof LayoutGrid
  labelKey: string
}

const MAIN_TABS: TabItem[] = [
  { to: '/feed', icon: LayoutGrid, labelKey: 'nav.feed' },
  { to: '/donations', icon: Gift, labelKey: 'nav.donations' },
  { to: '/chat', icon: MessageCircle, labelKey: 'nav.chat' },
]

function TabButton({ to, icon: Icon, label }: Readonly<{ to: string; icon: typeof LayoutGrid; label: string }>) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
          isActive ? 'text-teal-700' : 'text-slate-500 hover:text-teal-600',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.2px]')} aria-hidden />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const { t } = useTranslation()
  const preset = usePersonaStore((s) => s.preset)
  const roles = getRolesForPreset(preset)
  const uid = getActingUserId(preset)
  const showAdmin = canAccessAdmin(roles)
  const showOperator = canAccessOperatorWorkspace(roles)

  const MORE_ITEMS = [
    { to: '/profile', icon: UserCircle, labelKey: 'nav.profile' },
    { to: '/rides', icon: Car, labelKey: 'nav.rides' },
    { to: '/items', icon: HeartHandshake, labelKey: 'nav.items' },
    { to: '/challenges', icon: Trophy, labelKey: 'nav.challenges' },
    { to: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
    { to: '/statistics', icon: BarChart3, labelKey: 'nav.statistics' },
    { to: '/discover', icon: Users, labelKey: 'nav.discover' },
    { to: '/hierarchy', icon: Users, labelKey: 'nav.hierarchy' },
    { to: '/sync', icon: RefreshCw, labelKey: 'nav.sync' },
    { to: '/donations/shiduchim-tov', icon: Link2, labelKey: 'nav.shiduchimTov' },
    ...(showOperator ? [{ to: '/donations/shiduchim-tov/queue', icon: Link2, labelKey: 'nav.operatorQueue' as const }] : []),
    ...(showAdmin ? [{ to: '/admin', icon: Shield, labelKey: 'nav.admin' as const }] : []),
    ...(uid ? [] : [{ to: '/login', icon: UserCircle, labelKey: 'nav.login' as const }]),
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
      <div className="mx-auto w-full max-w-lg border-t border-slate-200 px-2 py-2">
        <div className="flex flex-nowrap gap-1 overflow-x-auto pb-safe">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon
            const label = t(item.labelKey, item.labelKey.split('.').pop() ?? '')
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    isActive
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700',
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="flex h-16 items-stretch border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-lg items-stretch">
          {MAIN_TABS.slice(0, 2).map((tab) => (
            <TabButton
              key={tab.to}
              to={tab.to}
              icon={tab.icon}
              label={t(tab.labelKey)}
            />
          ))}

          {/* Center FAB — Create Post */}
          <div className="relative z-10 flex min-w-14 shrink-0 items-stretch justify-center">
            <NavLink
              to="/posts/new"
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5',
                  isActive ? 'text-teal-700' : 'text-white',
                )
              }
            >
              <span className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-500/30 transition-all hover:bg-teal-500 active:scale-95">
                <Activity className="h-5 w-5 text-white" aria-hidden />
              </span>
            </NavLink>
          </div>

          {MAIN_TABS.slice(2, 3).map((tab) => (
            <TabButton
              key={tab.to}
              to={tab.to}
              icon={tab.icon}
              label={t(tab.labelKey)}
            />
          ))}
        </div>
      </nav>
    </div>
  )
}
