/**
 * Admin / ERP back-office mock data — PRD §3.11 + §13.
 * Includes dynamic tables, CRM, tasks, files, members, financial summary,
 * reported content moderation queue, and pending organization approvals.
 */

export interface AdminTableDef {
  id: string
  name: string
  columns: Array<{ id: string; name: string; type: 'text' | 'number' | 'date' }>
}

export interface AdminRow {
  id: string
  table_id: string
  data: Record<string, string | number>
}

export interface CrmContact {
  id: string
  name: string
  email: string
  phone: string
  organization?: string
  notes: string
  status: 'lead' | 'active' | 'paused' | 'closed'
  last_contact_at: string
}

export interface AdminTask {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  parent_task_id: string | null
  assignees: string[]
  due_date?: string
  estimated_hours?: number
  reported_hours?: number
}

export interface AdminFile {
  id: string
  name: string
  folder: string
  size_kb: number
  uploaded_by: string
  uploaded_at: string
}

export interface CommunityMemberRow {
  id: string
  name: string
  city: string
  role: string
  status: 'active' | 'pending_verification' | 'suspended'
  joined_at: string
}

export interface AdminFinanceMonth {
  month: string
  donations_in: number
  expenses_out: number
  active_donors: number
}

export interface AdminFinanceSummary {
  ytd_donations: number
  ytd_expenses: number
  active_recurring_donors: number
  one_time_donors: number
  largest_donation: { amount: number; donor_display: string }
  monthly: AdminFinanceMonth[]
}

export interface AdminReportedPost {
  id: string
  reporter_display: string
  post_id: string
  post_excerpt: string
  reason: 'spam' | 'offensive' | 'misleading' | 'duplicate' | 'other'
  reporter_notes?: string
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed'
  reported_at: string
}

export interface AdminOrgApplication {
  id: string
  org_name: string
  contact_name: string
  contact_email: string
  city: string
  registry_number: string
  fields: string[]
  description: string
  documents: number
  status: 'pending_review' | 'awaiting_documents' | 'approved' | 'rejected'
  submitted_at: string
}

export const VISION_ADMIN_TABLES: AdminTableDef[] = [
  {
    id: 'tbl-outreach',
    name: 'קשרי קהילה',
    columns: [
      { id: 'c1', name: 'ארגון', type: 'text' },
      { id: 'c2', name: 'איש קשר', type: 'text' },
      { id: 'c3', name: 'סטטוס', type: 'text' },
      { id: 'c4', name: 'מתנדבים פעילים', type: 'number' },
    ],
  },
  {
    id: 'tbl-events',
    name: 'אירועי קהילה — מאי',
    columns: [
      { id: 'e1', name: 'תאריך', type: 'date' },
      { id: 'e2', name: 'אירוע', type: 'text' },
      { id: 'e3', name: 'אחראי', type: 'text' },
      { id: 'e4', name: 'משתתפים', type: 'number' },
    ],
  },
]

export const VISION_ADMIN_ROWS: AdminRow[] = [
  {
    id: 'row-1',
    table_id: 'tbl-outreach',
    data: { c1: 'אורות תל אביב', c2: 'נועה שמעוני', c3: 'פעיל', c4: 112 },
  },
  {
    id: 'row-2',
    table_id: 'tbl-outreach',
    data: { c1: 'יד ביד נתניה', c2: 'איתן בר', c3: 'פעיל', c4: 48 },
  },
  {
    id: 'row-3',
    table_id: 'tbl-outreach',
    data: { c1: 'אור לחיינו', c2: 'דליה אטיאס', c3: 'בהליך אישור', c4: 0 },
  },
  {
    id: 'row-4',
    table_id: 'tbl-outreach',
    data: { c1: 'מטה הקהילה ירושלים', c2: 'דוד אבן', c3: 'מושעה', c4: 14 },
  },
  {
    id: 'row-5',
    table_id: 'tbl-events',
    data: { e1: '2026-05-08', e2: 'יום פתוח באורות', e3: 'נועה שמעוני', e4: 220 },
  },
  {
    id: 'row-6',
    table_id: 'tbl-events',
    data: { e1: '2026-05-12', e2: 'חלוקת סלי מזון נתניה', e3: 'איתן בר', e4: 80 },
  },
  {
    id: 'row-7',
    table_id: 'tbl-events',
    data: { e1: '2026-05-19', e2: 'סדנת מיומנויות לבני נוער', e3: 'מרים כץ', e4: 45 },
  },
]

export const VISION_CRM_CONTACTS: CrmContact[] = [
  {
    id: 'crm-1',
    name: 'מרכז צעירים תל אביב',
    email: 'info@example.org',
    phone: '+972-3-555-0101',
    organization: 'עיריית ת"א',
    notes: 'שוחחנו על שיתוף פעולה בחודש הבא — חוגי תכנות לנוער.',
    status: 'active',
    last_contact_at: '2026-05-02T11:00:00.000Z',
  },
  {
    id: 'crm-2',
    name: 'בית ספר רבין נתניה',
    email: 'rabin@example.org',
    phone: '+972-9-555-0202',
    notes: 'מבקשים תרומת מחשבים לכיתת מחשבים.',
    status: 'lead',
    last_contact_at: '2026-04-29T10:00:00.000Z',
  },
  {
    id: 'crm-3',
    name: 'קופ"ח מכבי — סניף הרצליה',
    email: 'maccabi.hertzliya@example.org',
    phone: '+972-9-555-0303',
    notes: 'ממתינים לחתימת מסמך אישור הסעות חולים.',
    status: 'active',
    last_contact_at: '2026-04-25T09:00:00.000Z',
  },
  {
    id: 'crm-4',
    name: 'תורם פרטי — משפחת ש.',
    email: 'private@anon.example',
    phone: '—',
    notes: 'תורם חודשי קבוע 5,000 ₪. מעדיף שלא להופיע בפרסום.',
    status: 'active',
    last_contact_at: '2026-05-01T08:00:00.000Z',
  },
  {
    id: 'crm-5',
    name: 'עיריית רמת גן — מח׳ רווחה',
    email: 'rg.welfare@example.org',
    phone: '+972-3-555-0404',
    notes: 'בודקים שיתוף פעולה לפנייה משותפת לאוכלוסייה הוותיקה.',
    status: 'paused',
    last_contact_at: '2026-04-15T14:00:00.000Z',
  },
]

export const VISION_ADMIN_TASKS: AdminTask[] = [
  {
    id: 'task-1',
    title: 'סנכרון משתמשים Firebase ↔ MongoDB',
    description: 'בדיקה שכל המשתמשים החדשים מסונכרנים ב-2 הכיוונים.',
    status: 'in_progress',
    priority: 'high',
    parent_task_id: null,
    assignees: ['אורי לבנון'],
    due_date: '2026-05-10',
    estimated_hours: 6,
    reported_hours: 3.5,
  },
  {
    id: 'task-2',
    title: 'בדיקת דוח פעילות Q2',
    status: 'todo',
    priority: 'medium',
    parent_task_id: 'task-1',
    assignees: ['נדב אבידן'],
    due_date: '2026-05-15',
    estimated_hours: 4,
  },
  {
    id: 'task-3',
    title: 'אישור בקשת ארגון "אור לחיינו"',
    description: 'בדיקת מסמכים, אישור מסמכי תקנון, פתיחת לוח בקרה.',
    status: 'review',
    priority: 'high',
    parent_task_id: null,
    assignees: ['אורי לבנון', 'נדב אבידן'],
    due_date: '2026-05-07',
    estimated_hours: 2,
    reported_hours: 1,
  },
  {
    id: 'task-4',
    title: 'הכנה לאירוע יום פתוח אורות',
    description: 'תיאום מתנדבים, אישור תקציב, פרסום בפיד.',
    status: 'in_progress',
    priority: 'urgent',
    parent_task_id: null,
    assignees: ['נועה שמעוני', 'מרים כץ'],
    due_date: '2026-05-08',
    estimated_hours: 12,
    reported_hours: 7,
  },
  {
    id: 'task-5',
    title: 'תיאום חלוקת סלי מזון נתניה',
    status: 'todo',
    priority: 'high',
    parent_task_id: null,
    assignees: ['איתן בר', 'דוד הלל', 'יעל מזרחי'],
    due_date: '2026-05-12',
    estimated_hours: 8,
  },
  {
    id: 'task-6',
    title: 'מעבר מודרציה אוטומטית — בחינת מיקרו-קונטקסט',
    status: 'blocked',
    priority: 'medium',
    parent_task_id: null,
    assignees: ['נדב אבידן'],
    due_date: '2026-05-25',
    estimated_hours: 16,
  },
  {
    id: 'task-7',
    title: 'הכנת חומר הסברה לקטגוריית "ידע"',
    status: 'done',
    priority: 'medium',
    parent_task_id: null,
    assignees: ['שירה גרין'],
    due_date: '2026-04-30',
    estimated_hours: 6,
    reported_hours: 5.5,
  },
]

export const VISION_ADMIN_FILES: AdminFile[] = [
  {
    id: 'f1',
    name: 'policy-draft-v3.pdf',
    folder: '/legal',
    size_kb: 420,
    uploaded_by: 'אורי לבנון',
    uploaded_at: '2026-04-28T10:00:00.000Z',
  },
  {
    id: 'f2',
    name: 'volunteers-export-q2.csv',
    folder: '/exports',
    size_kb: 120,
    uploaded_by: 'נדב אבידן',
    uploaded_at: '2026-04-30T18:00:00.000Z',
  },
  {
    id: 'f3',
    name: 'or-lechayinu-bylaws.pdf',
    folder: '/orgs/pending',
    size_kb: 880,
    uploaded_by: 'דליה אטיאס',
    uploaded_at: '2026-04-29T12:00:00.000Z',
  },
  {
    id: 'f4',
    name: 'donation-receipts-april.pdf',
    folder: '/finance',
    size_kb: 1240,
    uploaded_by: 'אורי לבנון',
    uploaded_at: '2026-05-01T09:00:00.000Z',
  },
  {
    id: 'f5',
    name: 'open-day-poster-orot.png',
    folder: '/marketing',
    size_kb: 2200,
    uploaded_by: 'שירה גרין',
    uploaded_at: '2026-05-02T15:00:00.000Z',
  },
  {
    id: 'f6',
    name: 'volunteer-handbook-2026.pdf',
    folder: '/handbooks',
    size_kb: 3400,
    uploaded_by: 'נועה שמעוני',
    uploaded_at: '2026-03-15T11:00:00.000Z',
  },
]

export const VISION_COMMUNITY_MEMBERS: CommunityMemberRow[] = [
  {
    id: 'cm-1',
    name: 'דנה רז',
    city: 'רמת גן',
    role: 'user',
    status: 'active',
    joined_at: '2025-07-08',
  },
  {
    id: 'cm-2',
    name: 'יעל מזרחי',
    city: 'נתניה',
    role: 'volunteer',
    status: 'active',
    joined_at: '2024-09-01',
  },
  {
    id: 'cm-3',
    name: 'איתן בר',
    city: 'נתניה',
    role: 'volunteer_manager',
    status: 'active',
    joined_at: '2023-03-11',
  },
  {
    id: 'cm-4',
    name: 'תומר וייס',
    city: 'חיפה',
    role: 'user',
    status: 'pending_verification',
    joined_at: '2026-02-01',
  },
  {
    id: 'cm-5',
    name: 'מיכל קרן',
    city: 'הרצליה',
    role: 'operator',
    status: 'active',
    joined_at: '2024-02-18',
  },
  {
    id: 'cm-6',
    name: 'משתמש_חסום_42',
    city: 'אשדוד',
    role: 'user',
    status: 'suspended',
    joined_at: '2025-12-04',
  },
  {
    id: 'cm-7',
    name: 'דן יפה',
    city: 'ירושלים',
    role: 'user',
    status: 'active',
    joined_at: '2025-10-20',
  },
  {
    id: 'cm-8',
    name: 'רבקה כהן',
    city: 'ירושלים',
    role: 'volunteer',
    status: 'active',
    joined_at: '2022-11-20',
  },
]

export const VISION_FINANCE_SUMMARY: AdminFinanceSummary = {
  ytd_donations: 412580,
  ytd_expenses: 298140,
  active_recurring_donors: 184,
  one_time_donors: 612,
  largest_donation: { amount: 25000, donor_display: 'משפחת ש. (אנונימי)' },
  monthly: [
    { month: 'ינואר', donations_in: 62000, expenses_out: 41000, active_donors: 156 },
    { month: 'פברואר', donations_in: 71500, expenses_out: 49000, active_donors: 162 },
    { month: 'מרץ', donations_in: 84200, expenses_out: 58000, active_donors: 171 },
    { month: 'אפריל', donations_in: 96800, expenses_out: 71000, active_donors: 178 },
    { month: 'מאי (חלקי)', donations_in: 98080, expenses_out: 79140, active_donors: 184 },
  ],
}

export const VISION_REPORTED_POSTS: AdminReportedPost[] = [
  {
    id: 'rp-1',
    reporter_display: 'משתמשת אנונימית',
    post_id: 'post-hidden-009',
    post_excerpt: '[מוסתר] פוסט לבדיקה — תוכן לבדיקת מודרציה.',
    reason: 'spam',
    reporter_notes: 'נראה שזה תוכן בדיקות ולא תוכן אמיתי.',
    status: 'open',
    reported_at: '2026-05-03T14:00:00.000Z',
  },
  {
    id: 'rp-2',
    reporter_display: 'דנה ר.',
    post_id: 'post-suspect-1',
    post_excerpt: '"מבטיחים החזר ב-X% לכל מי שמשתתף..."',
    reason: 'misleading',
    reporter_notes: 'נראה כמו מימון פירמידלי — לא תרומה אמיתית.',
    status: 'reviewing',
    reported_at: '2026-05-02T17:00:00.000Z',
  },
  {
    id: 'rp-3',
    reporter_display: 'אנונימי',
    post_id: 'post-suspect-2',
    post_excerpt: 'הפוסט הוסר מהתצוגה אך נשמר ביומן.',
    reason: 'offensive',
    status: 'resolved',
    reported_at: '2026-04-28T09:00:00.000Z',
  },
  {
    id: 'rp-4',
    reporter_display: 'יוסי ג.',
    post_id: 'post-022',
    post_excerpt: 'כובעים סרוגים לתרומה — הוסר מתוך טעות.',
    reason: 'duplicate',
    status: 'dismissed',
    reported_at: '2026-04-25T13:00:00.000Z',
  },
]

export const VISION_ORG_APPLICATIONS: AdminOrgApplication[] = [
  {
    id: 'app-1',
    org_name: 'אור לחיינו — הרצליה',
    contact_name: 'דליה אטיאס',
    contact_email: 'dalia@or-lechayinu.example',
    city: 'הרצליה',
    registry_number: '580-555-1100',
    fields: ['בריאות נפש', 'תמיכה רגשית', 'משפחות במצוקה'],
    description:
      'עמותה צעירה המעניקה תמיכה רגשית למשפחות שאיבדו אדם קרוב. מבקשים פרסום באפליקציה כדי לחזק את הקהילה.',
    documents: 4,
    status: 'pending_review',
    submitted_at: '2026-04-29T09:00:00.000Z',
  },
  {
    id: 'app-2',
    org_name: 'מטה הקהילה ירושלים',
    contact_name: 'דוד אבן',
    contact_email: 'david@mate-kehila.example',
    city: 'ירושלים',
    registry_number: '580-555-2200',
    fields: ['חינוך', 'נוער', 'התנדבות'],
    description: 'גוף עירוני המתאם בין עמותות לעמותה. מעוניין בלוח בקרה משותף.',
    documents: 6,
    status: 'awaiting_documents',
    submitted_at: '2026-04-22T15:00:00.000Z',
  },
  {
    id: 'app-3',
    org_name: 'בית מסילה',
    contact_name: 'נטע כהן',
    contact_email: 'neta@beit-mesila.example',
    city: 'באר שבע',
    registry_number: '580-555-3300',
    fields: ['גיל הזהב', 'חינוך מבוגרים'],
    description: 'מועדון חברים פעיל בשכונה ב׳ — מעוניין לפתוח דף לארגון.',
    documents: 3,
    status: 'pending_review',
    submitted_at: '2026-05-02T10:00:00.000Z',
  },
  {
    id: 'app-4',
    org_name: 'תכלת — זרוע התנדבות הצעירים',
    contact_name: 'תהל אריה',
    contact_email: 'tahel@tchelet.example',
    city: 'תל אביב–יפו',
    registry_number: '580-555-4400',
    fields: ['נוער', 'התנדבות', 'חירום'],
    description: 'רשת מתנדבים צעירים בעלי הכשרה לחירום אזרחי.',
    documents: 7,
    status: 'approved',
    submitted_at: '2026-04-12T08:00:00.000Z',
  },
]
