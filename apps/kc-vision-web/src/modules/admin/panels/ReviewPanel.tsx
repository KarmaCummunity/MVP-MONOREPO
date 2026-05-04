import { Flag, ShieldCheck } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import {
  VISION_REPORTED_POSTS,
  type AdminReportedPost,
} from '../../../fixtures/admin.fixtures'

const STATUS_VARIANT: Record<AdminReportedPost['status'], 'warning' | 'outline' | 'success' | 'danger'> = {
  open: 'warning',
  reviewing: 'outline',
  resolved: 'success',
  dismissed: 'danger',
}

const REASON_LABEL: Record<AdminReportedPost['reason'], string> = {
  spam: 'ספאם',
  offensive: 'תוכן פוגעני',
  misleading: 'הטעיה',
  duplicate: 'כפילות',
  other: 'אחר',
}

export function ReviewPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <ShieldCheck className="h-5 w-5 shrink-0 text-teal-700" />
        <p>
          המודרציה הקהילתית מטפלת בדיווחים שמגיעים ישירות מהפיד. כל פעולה
          מתועדת ב-Audit Trail; אין מחיקה — רק שינוי סטטוס.
        </p>
      </div>
      <ul className="space-y-3">
        {VISION_REPORTED_POSTS.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Flag className="mt-0.5 h-4 w-4 text-rose-600" />
                <div>
                  <p className="font-semibold text-slate-900">
                    דיווח: {REASON_LABEL[r.reason]}
                  </p>
                  <p className="text-xs text-slate-500">
                    מאת {r.reporter_display} ·{' '}
                    {new Date(r.reported_at).toLocaleString('he-IL')}
                  </p>
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
            </div>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {r.post_excerpt}
            </p>
            {r.reporter_notes ? (
              <p className="mt-2 text-xs text-slate-500">
                הערות מדווח: {r.reporter_notes}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white"
              >
                פתור (דמה)
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700"
              >
                דחה (דמה)
              </button>
              <button
                type="button"
                className="rounded-md border border-rose-200 px-3 py-1 text-xs text-rose-700"
              >
                הסר פוסט (דמה)
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
