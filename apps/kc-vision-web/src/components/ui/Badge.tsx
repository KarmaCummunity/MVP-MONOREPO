import { cn } from '../../lib/cn'

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline'
  className?: string
}) {
  const v =
    variant === 'success'
      ? 'bg-emerald-100 text-emerald-900'
      : variant === 'warning'
        ? 'bg-amber-100 text-amber-900'
        : variant === 'danger'
          ? 'bg-rose-100 text-rose-900'
          : variant === 'outline'
            ? 'border border-slate-300 bg-white text-slate-700'
            : 'bg-slate-200 text-slate-800'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        v,
        className,
      )}
    >
      {children}
    </span>
  )
}
