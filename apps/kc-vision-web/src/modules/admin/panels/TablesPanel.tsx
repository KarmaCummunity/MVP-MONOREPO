import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Tabs } from '../../../components/ui/Tabs'
import {
  VISION_ADMIN_ROWS,
  VISION_ADMIN_TABLES,
} from '../../../fixtures/admin.fixtures'

export function TablesPanel() {
  const [tableId, setTableId] = useState(VISION_ADMIN_TABLES[0]?.id ?? '')
  const table = VISION_ADMIN_TABLES.find((t) => t.id === tableId)
  const rows = VISION_ADMIN_ROWS.filter((r) => r.table_id === tableId)
  if (!table) return null

  return (
    <div className="space-y-4">
      <Tabs
        tabs={VISION_ADMIN_TABLES.map((t) => ({ id: t.id, label: t.name }))}
        value={tableId}
        onChange={(id) => setTableId(id)}
      />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{table.name}</h3>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded bg-teal-600 px-3 py-1 text-sm text-white"
          >
            <Plus className="h-4 w-4" /> שורה חדשה (דמה)
          </button>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b text-right">
              {table.columns.map((c) => (
                <th key={c.id} className="p-2 font-medium text-slate-600">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                {table.columns.map((c) => (
                  <td key={c.id} className="p-2">
                    {String(r.data[c.id] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
