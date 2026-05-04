/**
 * Mock operator workspace data — PRD §3.4 (Shiduchim Tov / matching).
 * Many cases & audit entries to give the workspace a "live" feel.
 */

const U_MICHAL = 'user-b203d4ae-6f10-4d8c-9e01-operator-michal'
const U_DANA = 'user-cd7712aa-5e44-4f2b-8c33-member-dana'
const U_YAEL = 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael'
const U_EITAN = 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad'
const U_NOA = 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot'
const U_ELI = 'user-16'
const U_RACHEL = 'user-13'
const U_RIVKA = 'user-77223344-5566-7788-senior-rivka'
const U_TAMAR = 'user-19'
const U_AVI = 'user-14'
const U_DAVID = 'user-61bb90ee-3c22-4d50-a401-vol-david'

export type QueueStatus = 'unassigned' | 'assigned' | 'in_progress'

export type CaseStatus =
  | 'unassigned'
  | 'assigned'
  | 'in_progress'
  | 'proposed'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled'

export interface OperatorQueueItem {
  id: string
  post_id: string
  excerpt: string
  category: string
  city: string
  created_at: string
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  status: QueueStatus
  assigned_operator_id: string | null
  /** Avg minutes already spent in queue — useful for SLA visualization. */
  age_minutes: number
}

export interface MatchingCaseVision {
  id: string
  post_id: string
  excerpt: string
  requester_id: string
  requester_display_name: string
  city: string
  category: string
  assigned_operator_id: string | null
  status: CaseStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes: string
  opened_at: string
  closed_at?: string
}

export interface MatchingCandidateVision {
  id: string
  case_id: string
  candidate_user_id: string
  candidate_name: string
  candidate_type: 'volunteer' | 'donor'
  match_reason: string
  city: string
  status: 'proposed' | 'accepted' | 'declined' | 'withdrawn'
  proposed_at: string
}

export interface AuditEntryVision {
  id: string
  case_id: string
  actor_id: string
  actor_name: string
  action: string
  at: string
  details?: string
}

export const VISION_OPERATOR_QUEUE: OperatorQueueItem[] = [
  {
    id: 'q-1',
    post_id: 'post-l1-004',
    excerpt: 'בקשה רגישה — תמיכה אחרי אובדן במשפחה. מבקש שיחה אחת בשבוע.',
    category: 'mental-health',
    city: 'רמת גן',
    created_at: '2026-05-04T07:30:00.000Z',
    urgency: 'high',
    status: 'unassigned',
    assigned_operator_id: null,
    age_minutes: 80,
  },
  {
    id: 'q-2',
    post_id: 'post-l2-003',
    excerpt: 'צריך מתנדב לפרוק משלוח מחר בבוקר — 09:00 בחניון המרכז.',
    category: 'time',
    city: 'נתניה',
    created_at: '2026-05-03T14:10:00.000Z',
    urgency: 'medium',
    status: 'assigned',
    assigned_operator_id: U_MICHAL,
    age_minutes: 1090,
  },
  {
    id: 'q-3',
    post_id: 'post-q3-mock',
    excerpt: 'משפחה צעירה צריכה ליווי לטיפול שבועי — אחרי הפסקה בעבודה.',
    category: 'medical',
    city: 'חולון',
    created_at: '2026-05-04T05:00:00.000Z',
    urgency: 'urgent',
    status: 'unassigned',
    assigned_operator_id: null,
    age_minutes: 230,
  },
  {
    id: 'q-4',
    post_id: 'post-q4-mock',
    excerpt: 'בקשת ליווי לקשיש לבד — שיחה טלפונית כל יומיים.',
    category: 'golden-age',
    city: 'ירושלים',
    created_at: '2026-05-03T09:00:00.000Z',
    urgency: 'medium',
    status: 'in_progress',
    assigned_operator_id: U_MICHAL,
    age_minutes: 1430,
  },
  {
    id: 'q-5',
    post_id: 'post-q5-mock',
    excerpt: 'נשארו ארבעה ילדים בלי ציוד לבית הספר — אישור פדגוגי במקום.',
    category: 'education',
    city: 'באר שבע',
    created_at: '2026-05-02T18:00:00.000Z',
    urgency: 'high',
    status: 'assigned',
    assigned_operator_id: U_MICHAL,
    age_minutes: 2360,
  },
  {
    id: 'q-6',
    post_id: 'post-q6-mock',
    excerpt: 'אם חד-הורית מחפשת עזרה ברישום קייטנת קיץ.',
    category: 'support',
    city: 'תל אביב–יפו',
    created_at: '2026-05-04T08:15:00.000Z',
    urgency: 'low',
    status: 'unassigned',
    assigned_operator_id: null,
    age_minutes: 35,
  },
  {
    id: 'q-7',
    post_id: 'post-q7-mock',
    excerpt: 'בקשה לליווי דוברת רוסית בקופת חולים בכפר סבא.',
    category: 'languages',
    city: 'כפר סבא',
    created_at: '2026-05-03T20:40:00.000Z',
    urgency: 'medium',
    status: 'unassigned',
    assigned_operator_id: null,
    age_minutes: 765,
  },
]

export const VISION_MATCHING_CASES: MatchingCaseVision[] = [
  {
    id: 'case-1',
    post_id: 'post-l2-010',
    excerpt: 'מישהו יכול לעזור עם תרגום מסמך?',
    requester_id: U_DANA,
    requester_display_name: 'דנה ר.',
    city: 'רמת גן',
    category: 'languages',
    assigned_operator_id: U_MICHAL,
    status: 'in_progress',
    priority: 'medium',
    notes:
      'ביקש תרגום מסמך משפטי קצר מאנגלית. לא דחוף. עדיף מתנדב באזור עם רקע משפטי בסיסי.',
    opened_at: '2026-05-03T10:00:00.000Z',
  },
  {
    id: 'case-2',
    post_id: 'post-q4-mock',
    excerpt: 'בקשת ליווי לקשיש לבד.',
    requester_id: U_RIVKA,
    requester_display_name: 'ר. כ.',
    city: 'ירושלים',
    category: 'golden-age',
    assigned_operator_id: U_MICHAL,
    status: 'proposed',
    priority: 'medium',
    notes:
      'גרה לבד, בריאה יחסית, מתעניינת באומנות וספרים. נשלחה הצעה לרבקה (סורגת + מתנדבת בשכונה).',
    opened_at: '2026-05-03T09:00:00.000Z',
  },
  {
    id: 'case-3',
    post_id: 'post-q3-mock',
    excerpt: 'ליווי לטיפול שבועי באזור חולון.',
    requester_id: U_RACHEL,
    requester_display_name: 'ר. ס.',
    city: 'חולון',
    category: 'medical',
    assigned_operator_id: U_MICHAL,
    status: 'assigned',
    priority: 'high',
    notes:
      'אישה צעירה — נדרש מלווה רגיש לטיפול אונקולוגי. עדיף מי שיכולה לחזור על מספר ביקורים.',
    opened_at: '2026-05-04T05:00:00.000Z',
  },
  {
    id: 'case-4',
    post_id: 'post-q5-mock',
    excerpt: 'ציוד לבית ספר — 4 ילדים.',
    requester_id: U_TAMAR,
    requester_display_name: 'ת. ב.',
    city: 'באר שבע',
    category: 'education',
    assigned_operator_id: U_MICHAL,
    status: 'accepted',
    priority: 'high',
    notes:
      'הצעה ל"יד ביד" התקבלה — איתן יחבר עם הצוות שיוצא לבאר שבע ביום ה׳.',
    opened_at: '2026-05-02T18:00:00.000Z',
  },
  {
    id: 'case-5',
    post_id: 'post-old-001',
    excerpt: 'משפחה ביקשה סלי מזון — 3 חודשים.',
    requester_id: U_RACHEL,
    requester_display_name: 'משפחה א.',
    city: 'חולון',
    category: 'food',
    assigned_operator_id: U_MICHAL,
    status: 'completed',
    priority: 'high',
    notes:
      'הסתיים ב-30.04 — סוכם עם רחל לעדכון רבעוני. תיק נסגר לאחר אישור הפסקה מצד המבקש.',
    opened_at: '2026-04-01T08:00:00.000Z',
    closed_at: '2026-04-30T15:00:00.000Z',
  },
  {
    id: 'case-6',
    post_id: 'post-old-002',
    excerpt: 'בקשת מימון חד-פעמי לחשבון חשמל.',
    requester_id: U_DANA,
    requester_display_name: 'אנונימי',
    city: 'נתניה',
    category: 'money',
    assigned_operator_id: U_MICHAL,
    status: 'declined',
    priority: 'medium',
    notes: 'לא נמצאה התאמה תוך 5 ימים — הופנה לעמותה חיצונית מתאימה.',
    opened_at: '2026-04-15T11:00:00.000Z',
    closed_at: '2026-04-22T10:00:00.000Z',
  },
]

export const VISION_MATCHING_CANDIDATES: MatchingCandidateVision[] = [
  {
    id: 'cand-1',
    case_id: 'case-1',
    candidate_user_id: U_NOA,
    candidate_name: 'נועה שמעוני',
    candidate_type: 'volunteer',
    match_reason: 'ניסיון בליווי תרגומים בעיר. זמינה ב-2 בערב.',
    city: 'תל אביב–יפו',
    status: 'proposed',
    proposed_at: '2026-05-03T11:30:00.000Z',
  },
  {
    id: 'cand-2',
    case_id: 'case-1',
    candidate_user_id: 'user-18',
    candidate_name: 'דן יפה',
    candidate_type: 'volunteer',
    match_reason: 'סטודנט למשפטים בירושלים — מציע סקירה משפטית בסיסית.',
    city: 'ירושלים',
    status: 'proposed',
    proposed_at: '2026-05-03T12:10:00.000Z',
  },
  {
    id: 'cand-3',
    case_id: 'case-2',
    candidate_user_id: U_RIVKA,
    candidate_name: 'רבקה כהן',
    candidate_type: 'volunteer',
    match_reason: 'גרה באזור, פנסיונרית פעילה, מקפידה על שיחה שבועית.',
    city: 'ירושלים',
    status: 'accepted',
    proposed_at: '2026-05-03T16:00:00.000Z',
  },
  {
    id: 'cand-4',
    case_id: 'case-3',
    candidate_user_id: U_AVI,
    candidate_name: 'אבי בן דוד',
    candidate_type: 'volunteer',
    match_reason: 'נהג מתנדב — מסיע באופן קבוע לטיפולים רפואיים.',
    city: 'אשדוד',
    status: 'proposed',
    proposed_at: '2026-05-04T07:00:00.000Z',
  },
  {
    id: 'cand-5',
    case_id: 'case-3',
    candidate_user_id: U_ELI,
    candidate_name: 'אלי שלום',
    candidate_type: 'volunteer',
    match_reason: 'פיזיותרפיסט — יכול לסייע בליווי וגם בייעוץ אחרי הטיפול.',
    city: 'רעננה',
    status: 'proposed',
    proposed_at: '2026-05-04T07:05:00.000Z',
  },
  {
    id: 'cand-6',
    case_id: 'case-4',
    candidate_user_id: U_EITAN,
    candidate_name: 'איתן בר',
    candidate_type: 'volunteer',
    match_reason: 'מנהל מתנדבים ביד ביד — נסיעה קבועה לבאר שבע ביום ה׳.',
    city: 'נתניה',
    status: 'accepted',
    proposed_at: '2026-05-03T09:00:00.000Z',
  },
  {
    id: 'cand-7',
    case_id: 'case-5',
    candidate_user_id: U_DAVID,
    candidate_name: 'דוד הלל',
    candidate_type: 'volunteer',
    match_reason: 'מתנדב מחסן — מארגן סלים שבועיים.',
    city: 'הרצליה',
    status: 'accepted',
    proposed_at: '2026-04-02T10:00:00.000Z',
  },
  {
    id: 'cand-8',
    case_id: 'case-5',
    candidate_user_id: U_YAEL,
    candidate_name: 'יעל מזרחי',
    candidate_type: 'volunteer',
    match_reason: 'הסעות שבועיות בנתניה — מספקת ליווי בקניות.',
    city: 'נתניה',
    status: 'accepted',
    proposed_at: '2026-04-02T11:00:00.000Z',
  },
]

export const VISION_AUDIT_TRAIL: AuditEntryVision[] = [
  {
    id: 'a-1',
    case_id: 'case-1',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'case_created',
    at: '2026-05-03T10:00:00.000Z',
  },
  {
    id: 'a-2',
    case_id: 'case-1',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'note_added',
    at: '2026-05-03T10:08:00.000Z',
    details: 'אומת מקור הבקשה — נשלחה הודעה למבקש לאישור פתיחת תיק.',
  },
  {
    id: 'a-3',
    case_id: 'case-1',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'candidate_proposed',
    at: '2026-05-03T11:30:00.000Z',
    details: 'cand-1 — נועה שמעוני',
  },
  {
    id: 'a-4',
    case_id: 'case-1',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'candidate_proposed',
    at: '2026-05-03T12:10:00.000Z',
    details: 'cand-2 — דן יפה',
  },
  {
    id: 'a-5',
    case_id: 'case-2',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'case_created',
    at: '2026-05-03T09:00:00.000Z',
  },
  {
    id: 'a-6',
    case_id: 'case-2',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'candidate_accepted',
    at: '2026-05-03T16:30:00.000Z',
    details: 'cand-3 — רבקה כהן אישרה.',
  },
  {
    id: 'a-7',
    case_id: 'case-3',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'case_created',
    at: '2026-05-04T05:00:00.000Z',
  },
  {
    id: 'a-8',
    case_id: 'case-3',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'candidate_proposed',
    at: '2026-05-04T07:00:00.000Z',
    details: 'cand-4 + cand-5 — שני מועמדים בו-זמנית.',
  },
  {
    id: 'a-9',
    case_id: 'case-4',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'case_created',
    at: '2026-05-02T18:00:00.000Z',
  },
  {
    id: 'a-10',
    case_id: 'case-4',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'candidate_accepted',
    at: '2026-05-03T09:00:00.000Z',
    details: 'cand-6 — איתן בר אישר.',
  },
  {
    id: 'a-11',
    case_id: 'case-5',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'case_completed',
    at: '2026-04-30T15:00:00.000Z',
    details: 'נסגר לאחר 4 שבועות של ליווי.',
  },
  {
    id: 'a-12',
    case_id: 'case-6',
    actor_id: U_MICHAL,
    actor_name: 'מיכל קרן',
    action: 'case_declined',
    at: '2026-04-22T10:00:00.000Z',
    details: 'הופנה לעמותה חיצונית "פעמונים".',
  },
]
