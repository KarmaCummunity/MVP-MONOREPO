import { Mail, Phone } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { VISION_CRM_CONTACTS } from '../../../fixtures/admin.fixtures'

const STATUS_VARIANT = {
  active: 'success',
  lead: 'warning',
  paused: 'outline',
  closed: 'danger',
} as const

export function CrmPanel() {
  return (
    <ul className="space-y-3">
      {VISION_CRM_CONTACTS.map((c) => (
        <li
          key={c.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{c.name}</p>
              {c.organization ? (
                <p className="text-xs text-slate-500">{c.organization}</p>
              ) : null}
            </div>
            <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {c.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {c.phone}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{c.notes}</p>
          <p className="mt-1 text-xs text-slate-400">
            קשר אחרון:{' '}
            {new Date(c.last_contact_at).toLocaleDateString('he-IL')}
          </p>
        </li>
      ))}
    </ul>
  )
}
