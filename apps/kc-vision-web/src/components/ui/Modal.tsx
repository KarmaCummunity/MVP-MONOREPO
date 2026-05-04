import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  className?: string
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={cn(
          'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl',
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
