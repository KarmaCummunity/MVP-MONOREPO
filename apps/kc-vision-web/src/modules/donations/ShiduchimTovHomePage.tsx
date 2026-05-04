import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { canAccessOperatorWorkspace } from '../../lib/roles'
import { VISION_COMMUNITY_STATS } from '../../fixtures/stats.fixtures'
import { getRolesForPreset, usePersonaStore } from '../../store/personaStore'

export function ShiduchimTovHomePage() {
  const preset = usePersonaStore((s) => s.preset)
  const roles = getRolesForPreset(preset)
  const op = canAccessOperatorWorkspace(roles)

  if (op) {
    return (
      <div>
        <PageHeader title="שידוכים טוב — Workspace" subtitle="§2.15.4" />
        <p className="mb-4 text-slate-600">
          בחרו תת־מסך מהניווט למעלה (תור / מקרים).
        </p>
        <Link
          className="inline-flex rounded-lg bg-teal-600 px-4 py-2 text-white"
          to="/donations/shiduchim-tov/queue"
        >
          לתור ההתאמה
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="שידוכים טוב"
        subtitle="§2.15.3 — הסבר למשתמש שאינו אופרטור"
      />
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">מה זה?</h2>
        <p className="mt-2 text-slate-700">
          התאמת צרכים רגישים למתנדבים ותורמים באמצעות צוות אופרטורים — לא מנוע
          המלצות אוטומטי (SRS §2.14).
        </p>
      </section>
      <section className="rounded-xl border border-teal-200 bg-teal-50 p-6">
        <h3 className="font-semibold text-teal-900">השפעה קהילתית (דמה)</h3>
        <p className="mt-2 text-teal-800">
          משתמשים רשומים: ~{VISION_COMMUNITY_STATS.total_users.toLocaleString('he-IL')}
        </p>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/posts/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-white"
        >
          צור בקשה פרטית (מוביל ליצירת פוסט)
        </Link>
        <button type="button" className="rounded-lg border px-4 py-2">
          למידע נוסף (FAQ דמה)
        </button>
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold">שאלות נפוצות</summary>
        <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-slate-600">
          <li>מי רואה את הבקשה שלי ברמת L1?</li>
          <li>מתי מתקבלות התראות לאופרטורים?</li>
        </ul>
      </details>
    </div>
  )
}
