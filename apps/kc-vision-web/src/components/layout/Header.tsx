import { Bell, BookOpen, Globe, LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  type PersonaPreset,
  getActingUserId,
  usePersonaStore,
} from '../../store/personaStore'
import { useNotificationStore } from '../../store/notificationStore'

const PERSONA_ORDER: PersonaPreset[] = [
  'guest',
  'community',
  'volunteer',
  'volunteer_manager',
  'operator',
  'org_admin',
  'admin',
  'super_admin',
]

export function Header() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const preset = usePersonaStore((s) => s.preset)
  const setPreset = usePersonaStore((s) => s.setPreset)
  const uid = getActingUserId(preset)
  const notifications = useNotificationStore((s) => s.items)
  const unreadCount = notifications.filter(
    (n) => n.user_id === uid && !n.read,
  ).length

  const toggleLang = () => {
    const next = i18n.language?.startsWith('he') ? 'en' : 'he'
    void i18n.changeLanguage(next)
  }

  const handleLogout = () => {
    setPreset('guest')
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
      {/* Logo */}
      <span className="text-base font-bold tracking-tight text-teal-800">
        {t('app.title')}
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Persona selector */}
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as PersonaPreset)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 max-w-[110px]"
          title={t('persona.label')}
        >
          {PERSONA_ORDER.map((p) => (
            <option key={p} value={p}>
              {t(`persona.${p}`)}
            </option>
          ))}
        </select>

        {/* Language toggle */}
        <button
          type="button"
          onClick={toggleLang}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
          {i18n.language?.startsWith('he') ? 'EN' : 'עב'}
        </button>

        {/* PRD Viewer */}
        <NavLink
          to="/prd"
          className={({ isActive }) =>
            `rounded-full p-2 transition-colors ${isActive ? 'text-teal-700 bg-teal-50' : 'text-slate-500 hover:bg-slate-100 hover:text-teal-700'}`
          }
          title="מסמך PRD"
        >
          <BookOpen className="h-5 w-5" aria-hidden />
        </NavLink>

        {/* Notification bell */}
        <NavLink
          to="/notifications"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-teal-700 transition-colors"
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `rounded-full p-2 transition-colors ${isActive ? 'text-teal-700 bg-teal-50' : 'text-slate-500 hover:bg-slate-100 hover:text-teal-700'}`
          }
          title="הגדרות"
        >
          <Settings className="h-5 w-5" aria-hidden />
        </NavLink>

        {/* Logout — only when logged in */}
        {uid ? (
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title={t('nav.logout')}
          >
            <LogOut className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>
    </header>
  )
}
