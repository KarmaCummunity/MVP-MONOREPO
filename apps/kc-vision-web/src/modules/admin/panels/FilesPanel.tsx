import { FileText } from 'lucide-react'
import { VISION_ADMIN_FILES } from '../../../fixtures/admin.fixtures'

export function FilesPanel() {
  return (
    <ul className="space-y-2">
      {VISION_ADMIN_FILES.map((f) => (
        <li
          key={f.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">
                {f.folder}/{f.name}
              </p>
              <p className="text-xs text-slate-500">
                הועלה ע&quot;י {f.uploaded_by} ·{' '}
                {new Date(f.uploaded_at).toLocaleDateString('he-IL')}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-slate-400">{f.size_kb} KB</span>
        </li>
      ))}
    </ul>
  )
}
