import { PageHeader } from '../../components/ui/PageHeader'
import { VISION_USERS } from './fixtures/users.fixtures'

function TreeNode({ managerId }: { managerId: string | null }) {
  const children = VISION_USERS.filter((u) => u.parent_manager_id === managerId)
  if (children.length === 0) return null
  return (
    <ul className="mr-6 mt-2 list-disc border-r border-slate-200 pr-4">
      {children.map((c) => (
        <li key={c.id} className="py-1">
          <span className="font-medium">{c.name}</span>
          <span className="text-sm text-slate-500"> — {c.roles.join(', ')}</span>
          <TreeNode managerId={c.id} />
        </li>
      ))}
    </ul>
  )
}

export function HierarchyPage() {
  const roots = VISION_USERS.filter((u) => u.parent_manager_id === null)
  return (
    <div>
      <PageHeader title="היררכיה" subtitle="§2.2.3 — עץ דמה" />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {roots.map((r) => (
          <div key={r.id}>
            <p className="font-bold text-slate-900">{r.name}</p>
            <TreeNode managerId={r.id} />
          </div>
        ))}
      </div>
    </div>
  )
}
