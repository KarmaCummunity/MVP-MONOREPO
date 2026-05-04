import { Badge } from '../../../components/ui/Badge'
import {
  VISION_ADMIN_TASKS,
  type AdminTask,
} from '../../../fixtures/admin.fixtures'

const STATUS_VARIANT: Record<AdminTask['status'], 'outline' | 'warning' | 'success' | 'danger'> = {
  todo: 'outline',
  in_progress: 'warning',
  review: 'warning',
  done: 'success',
  blocked: 'danger',
}

const PRIORITY_TONE: Record<AdminTask['priority'], string> = {
  low: 'text-slate-500',
  medium: 'text-slate-700',
  high: 'text-orange-700',
  urgent: 'text-rose-700',
}

export function TasksPanel() {
  return (
    <ul className="space-y-3">
      {VISION_ADMIN_TASKS.map((task) => (
        <li
          key={task.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {task.parent_task_id ? '↳ ' : ''}
                {task.title}
              </p>
              {task.description ? (
                <p className="mt-1 text-sm text-slate-600">{task.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge variant={STATUS_VARIANT[task.status]}>{task.status}</Badge>
              <span
                className={`rounded-full bg-slate-50 px-2 py-0.5 text-xs ${PRIORITY_TONE[task.priority]}`}
              >
                {task.priority}
              </span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>משויכים: {task.assignees.join(', ')}</span>
            {task.due_date ? <span>· עד {task.due_date}</span> : null}
            {task.estimated_hours ? (
              <span>
                · {task.reported_hours ?? 0}/{task.estimated_hours} שעות
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="mt-2 text-xs text-teal-700 underline"
          >
            רישום שעות (דמה)
          </button>
        </li>
      ))}
    </ul>
  )
}
