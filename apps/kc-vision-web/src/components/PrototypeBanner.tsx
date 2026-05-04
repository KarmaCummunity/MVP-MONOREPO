import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

export function PrototypeBanner() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center gap-2 border-b-2 border-orange-400 bg-orange-50 px-3 py-1.5 text-center">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500 animate-pulse" />
      <p className="text-[11px] font-semibold text-orange-800">
        POC · FAKE DATA · {t('app.prototypeBanner')}
      </p>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500 animate-pulse" />
    </div>
  )
}
