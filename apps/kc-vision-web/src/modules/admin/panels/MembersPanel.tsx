import { Badge } from '../../../components/ui/Badge'
import {
  VISION_COMMUNITY_MEMBERS,
  type CommunityMemberRow,
} from '../../../fixtures/admin.fixtures'

const STATUS_VARIANT: Record<CommunityMemberRow['status'], 'success' | 'warning' | 'danger'> = {
  active: 'success',
  pending_verification: 'warning',
  suspended: 'danger',
}

export function MembersPanel() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-right">
            <th className="p-3 font-medium text-slate-600">שם</th>
            <th className="p-3 font-medium text-slate-600">עיר</th>
            <th className="p-3 font-medium text-slate-600">תפקיד</th>
            <th className="p-3 font-medium text-slate-600">סטטוס</th>
            <th className="p-3 font-medium text-slate-600">הצטרף</th>
          </tr>
        </thead>
        <tbody>
          {VISION_COMMUNITY_MEMBERS.map((m) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="p-3 font-medium">{m.name}</td>
              <td className="p-3 text-slate-600">{m.city}</td>
              <td className="p-3 text-slate-600">{m.role}</td>
              <td className="p-3">
                <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
              </td>
              <td className="p-3 text-xs text-slate-500">{m.joined_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
