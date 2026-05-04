import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
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
  MoreHorizontal,
  RefreshCw,
  Shield,
  Trophy,
  UserCircle,
  Users,
  X,
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
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
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

  const handleMoreItemClick = (to: string) => {
    setMoreOpen(false)
    navigate(to)
  }

  return (
    <>
      {/* More sheet overlay */}
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 w-full bg-black/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More slide-up sheet */}
      <div
        className={cn(
          'fixed bottom-16 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-2xl bg-white shadow-2xl transition-transform duration-300',
          !moreOpen && 'translate-y-full pointer-events-none',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">
            {t('nav.more', 'עוד')}
          </span>
          <button
            type="button"
            onClick={() => setMoreOpen(false)}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 p-3 pb-safe">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon
            const label = t(item.labelKey, item.labelKey.split('.').pop() ?? '')
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => handleMoreItemClick(item.to)}
                className="flex flex-col items-center gap-1 rounded-xl p-3 text-center text-xs font-medium text-slate-600 hover:bg-teal-50 hover:text-teal-700 active:scale-95 transition-all"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="leading-tight">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-slate-200 bg-white shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
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
          <NavLink
            to="/posts/new"
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5',
                isActive ? 'text-teal-700' : 'text-white',
              )
            }
          >
            <span className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-500/30 hover:bg-teal-500 active:scale-95 transition-all">
              <Activity className="h-5 w-5 text-white" aria-hidden />
            </span>
          </NavLink>

          {MAIN_TABS.slice(2).map((tab) => (
            <TabButton
              key={tab.to}
              to={tab.to}
              icon={tab.icon}
              label={t(tab.labelKey)}
            />
          ))}

          {/* More button */}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              moreOpen ? 'text-teal-700' : 'text-slate-500 hover:text-teal-600',
            )}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
            <span>{t('nav.more', 'עוד')}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
