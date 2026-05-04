import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { TablesPanel } from './panels/TablesPanel'
import { CrmPanel } from './panels/CrmPanel'
import { TasksPanel } from './panels/TasksPanel'
import { FilesPanel } from './panels/FilesPanel'
import { MembersPanel } from './panels/MembersPanel'
import { FinancePanel } from './panels/FinancePanel'
import { ReviewPanel } from './panels/ReviewPanel'
import { OrgApprovalsPanel } from './panels/OrgApprovalsPanel'

type TabId =
  | 'finance'
  | 'tables'
  | 'crm'
  | 'tasks'
  | 'files'
  | 'members'
  | 'review'
  | 'org_approvals'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'finance', label: 'כספים' },
  { id: 'tables', label: 'טבלאות דינמיות' },
  { id: 'crm', label: 'CRM' },
  { id: 'tasks', label: 'משימות' },
  { id: 'files', label: 'קבצים' },
  { id: 'members', label: 'חברי קהילה' },
  { id: 'review', label: 'מודרציה' },
  { id: 'org_approvals', label: 'אישורי ארגון' },
]

export function AdminPage() {
  const [tab, setTab] = useState<TabId>('finance')

  return (
    <div>
      <PageHeader
        title="ניהול"
        subtitle="לוח בקרה כולל לכלל הפעילות הארגונית"
      />
      <Tabs<TabId> tabs={TABS} value={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === 'finance' ? <FinancePanel /> : null}
        {tab === 'tables' ? <TablesPanel /> : null}
        {tab === 'crm' ? <CrmPanel /> : null}
        {tab === 'tasks' ? <TasksPanel /> : null}
        {tab === 'files' ? <FilesPanel /> : null}
        {tab === 'members' ? <MembersPanel /> : null}
        {tab === 'review' ? <ReviewPanel /> : null}
        {tab === 'org_approvals' ? <OrgApprovalsPanel /> : null}
      </div>
    </div>
  )
}
