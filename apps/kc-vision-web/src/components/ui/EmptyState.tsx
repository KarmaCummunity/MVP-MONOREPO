import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-slate-400" aria-hidden />
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-slate-600">{description}</p>
      ) : null}
    </div>
  )
}
