import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePersonaStore, type PersonaPreset } from '../../store/personaStore'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setPreset = usePersonaStore((s) => s.setPreset)

  const quickLogin = (p: PersonaPreset) => {
    setPreset(p)
    navigate('/feed', { replace: true })
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-center">
        <p className="text-sm font-semibold text-orange-800">
          🚧 POC - FAKE DATA ONLY
        </p>
        <p className="text-xs text-orange-600 mt-1">
          כל הכפתורים להלן מדמים התחברות ללא שרת
        </p>
      </div>
      
      <h1 className="text-2xl font-bold text-center">{t('auth.loginTitle')}</h1>
      
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white py-3 font-medium hover:bg-slate-50 transition-colors"
          onClick={() => quickLogin('community')}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Google Login (MOCK) → חבר קהילה</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-slate-300 bg-white py-3 font-medium hover:bg-slate-50 transition-colors"
          onClick={() => quickLogin('operator')}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Google Login (MOCK) → אופרטור</span>
        </button>

        <button
          type="button"
          className="rounded-lg bg-teal-600 py-3 font-medium text-white hover:bg-teal-700 transition-colors"
          onClick={() => quickLogin('community')}
        >
          Email Login (MOCK) → חבר קהילה
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-slate-500">או בחר פרסונה</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 py-2 text-sm hover:bg-slate-50 transition-colors"
            onClick={() => quickLogin('volunteer')}
          >
            מתנדב
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 py-2 text-sm hover:bg-slate-50 transition-colors"
            onClick={() => quickLogin('volunteer_manager')}
          >
            מנהל מתנדבים
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 py-2 text-sm hover:bg-slate-50 transition-colors"
            onClick={() => quickLogin('org_admin')}
          >
            מנהל ארגון
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 py-2 text-sm hover:bg-slate-50 transition-colors"
            onClick={() => quickLogin('admin')}
          >
            אדמין
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 py-2 text-sm hover:bg-slate-50 transition-colors"
            onClick={() => quickLogin('super_admin')}
          >
            סופר אדמין
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 py-2 text-sm hover:bg-slate-50 transition-colors"
            onClick={() => quickLogin('guest')}
          >
            {t('auth.guest')}
          </button>
        </div>
      </div>

      <div className="text-center">
        <a
          href="/register"
          className="text-sm text-teal-600 hover:underline"
        >
          עדיין אין לך חשבון? הירשם (MOCK)
        </a>
      </div>
    </div>
  )
}
