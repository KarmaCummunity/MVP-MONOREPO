import { NavLink } from 'react-router-dom'
import {
  Activity,
  BarChart3,
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
  Bell,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import {
  getActingUserId,
  getRolesForPreset,
  usePersonaStore,
} from '../../store/personaStore'
import { canAccessAdmin, canAccessOperatorWorkspace } from '../../lib/roles'

const linkCls =
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors'

function SidebarItem({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof Activity
  label: string
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          linkCls,
          isActive
            ? 'bg-teal-700 text-white'
            : 'text-slate-700 hover:bg-slate-100',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const preset = usePersonaStore((s) => s.preset)
  const roles = getRolesForPreset(preset)
  const uid = getActingUserId(preset)
  const showAdmin = canAccessAdmin(roles)
  const showOperatorArea = canAccessOperatorWorkspace(roles)

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3">
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        KC Vision
      </div>
      <SidebarItem to="/feed" icon={LayoutGrid} label={t('nav.feed')} />
      <SidebarItem to="/profile" icon={UserCircle} label={t('nav.profile')} />
      <SidebarItem to="/donations" icon={Gift} label={t('nav.donations')} />
      <SidebarItem to="/rides" icon={Car} label={t('nav.rides')} />
      <SidebarItem to="/items" icon={HeartHandshake} label={t('nav.items')} />
      <SidebarItem to="/posts/new" icon={Activity} label="+ פוסט" />
      <SidebarItem to="/chat" icon={MessageCircle} label={t('nav.chat')} />
      <SidebarItem to="/challenges" icon={Trophy} label={t('nav.challenges')} />
      <SidebarItem to="/notifications" icon={Bell} label={t('nav.notifications')} />
      <SidebarItem to="/statistics" icon={BarChart3} label={t('nav.statistics')} />
      <SidebarItem to="/discover" icon={Users} label={t('nav.discover')} />
      <SidebarItem to="/hierarchy" icon={Users} label={t('nav.hierarchy')} />
      <SidebarItem to="/sync" icon={RefreshCw} label={t('nav.sync')} />
      <SidebarItem
        to="/donations/shiduchim-tov"
        icon={Link2}
        label={t('nav.shiduchimTov')}
      />
      {showOperatorArea ? (
        <SidebarItem
          to="/donations/shiduchim-tov/queue"
          icon={Link2}
          label="תור אופרטור"
        />
      ) : null}
      {showAdmin ? (
        <SidebarItem to="/admin" icon={Shield} label={t('nav.admin')} />
      ) : null}
      {!uid ? (
        <NavLink
          to="/login"
          className={({ isActive }: { isActive: boolean }) =>
            cn(
              linkCls,
              isActive ? 'bg-teal-700 text-white' : 'hover:bg-slate-100',
            )
          }
        >
          {t('nav.login')}
        </NavLink>
      ) : null}
    </aside>
  )
}
