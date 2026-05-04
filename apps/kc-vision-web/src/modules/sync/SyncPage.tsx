import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { getRolesForPreset, usePersonaStore } from '../../store/personaStore'
import { hasAnyRole } from '../../lib/roles'

export function SyncPage() {
  const [status, setStatus] = useState<'synced' | 'offline'>('synced')
  const [busy, setBusy] = useState(false)
  const preset = usePersonaStore((s) => s.preset)
  const roles = getRolesForPreset(preset)
  const canAdminSync = hasAnyRole(roles, ['admin', 'super_admin'])

  const run = (label: string) => {
    setBusy(true)
    window.setTimeout(() => {
      setBusy(false)
      setStatus('synced')
      alert(`${label} הושלם (דמה)`)
    }, 900)
  }

  return (
    <div>
      <PageHeader title="סנכרון" subtitle="§2.12 — Firebase→DB (דמה)" />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="mb-4">
          מצב:{' '}
          <strong className={status === 'offline' ? 'text-rose-700' : 'text-emerald-700'}>
            {status === 'offline' ? 'לא מקוון' : 'מסונכרן'}
          </strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={() => setStatus((s) => (s === 'offline' ? 'synced' : 'offline'))}
          >
            החלף מצב תצוגה
          </button>
          {canAdminSync ? (
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-teal-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => run('Sync all')}
            >
              Sync all (דמה)
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
