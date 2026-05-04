import { Building2, FileCheck, Mail } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import {
  VISION_ORG_APPLICATIONS,
  type AdminOrgApplication,
} from '../../../fixtures/admin.fixtures'

const STATUS_VARIANT: Record<AdminOrgApplication['status'], 'warning' | 'outline' | 'success' | 'danger'> = {
  pending_review: 'warning',
  awaiting_documents: 'outline',
  approved: 'success',
  rejected: 'danger',
}

const STATUS_LABEL: Record<AdminOrgApplication['status'], string> = {
  pending_review: 'בבחינה',
  awaiting_documents: 'ממתין למסמכים',
  approved: 'אושר',
  rejected: 'נדחה',
}

export function OrgApprovalsPanel() {
  return (
    <ul className="space-y-3">
      {VISION_ORG_APPLICATIONS.map((a) => (
        <li
          key={a.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                <Building2 className="h-5 w-5 text-teal-700" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{a.org_name}</p>
                <p className="text-xs text-slate-500">
                  {a.city} · ע&quot;ר {a.registry_number}
                </p>
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[a.status]}>
              {STATUS_LABEL[a.status]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate-700">{a.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.fields.map((f) => (
              <Badge key={f} variant="outline">
                {f}
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {a.contact_name} · {a.contact_email}
            </span>
            <span className="inline-flex items-center gap-1">
              <FileCheck className="h-3.5 w-3.5" /> {a.documents} מסמכים מצורפים
            </span>
            <span>
              · הוגש {new Date(a.submitted_at).toLocaleDateString('he-IL')}
            </span>
          </div>
          {a.status === 'pending_review' || a.status === 'awaiting_documents' ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white"
              >
                אשר ארגון (דמה)
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700"
              >
                בקש השלמות (דמה)
              </button>
              <button
                type="button"
                className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-700"
              >
                דחה (דמה)
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
