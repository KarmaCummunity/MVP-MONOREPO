/**
 * Knowledge world (PRD §3.5.2):
 *  - Digital courses (multi-lesson, free, NGO-approved)
 *  - Private lessons (1-on-1, free)
 *  - Articles & long-form text
 *  - Videos & external links
 *
 * All entries are mock POC data and not persisted.
 */

const U_RON = 'user-20'
const U_MOSHE = 'user-10'
const U_ELI = 'user-16'
const U_RACHEL = 'user-13'
const U_RIVKA = 'user-77223344-5566-7788-senior-rivka'
const U_NOA = 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot'
const U_TAMAR = 'user-19'
const U_DAN = 'user-18'
const U_SHIRA = 'user-17'

export type KnowledgeApprovalStatus = 'approved' | 'pending_review' | 'rejected'

export interface KnowledgeCourseLesson {
  id: string
  title: string
  duration_minutes: number
  has_quiz: boolean
}

export interface KnowledgeCourseVision {
  id: string
  title: string
  description: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  language: 'he' | 'en' | 'ar' | 'ru'
  total_minutes: number
  enrolled_count: number
  rating: number
  thumbnail_color: string
  instructor_id: string
  instructor_name: string
  status: KnowledgeApprovalStatus
  lessons: KnowledgeCourseLesson[]
  approved_by_org_id?: string
  created_at: string
}

export interface KnowledgePrivateLesson {
  id: string
  title: string
  topic: string
  city: string
  format: 'remote' | 'in_person' | 'hybrid'
  duration_minutes: number
  weekly_slots: number
  teacher_id: string
  teacher_name: string
  rating: number
  status: KnowledgeApprovalStatus
}

export interface KnowledgeArticleVision {
  id: string
  title: string
  excerpt: string
  category: string
  reading_minutes: number
  author_id: string
  author_name: string
  status: KnowledgeApprovalStatus
  published_at: string
}

export interface KnowledgeVideoVision {
  id: string
  title: string
  category: string
  duration: string
  url: string
  source: 'youtube' | 'internal' | 'vimeo'
  views: number
  submitted_by_id: string
  submitted_by_name: string
  status: KnowledgeApprovalStatus
  created_at: string
}

/** Legacy thin link list — kept for back-compat with the simple Seeker tab. */
export interface KnowledgeLinkVision {
  id: string
  title: string
  url: string
  submitted_by_name: string
  created_at: string
}

export const VISION_KNOWLEDGE_COURSES: KnowledgeCourseVision[] = [
  {
    id: 'course-001',
    title: 'מבוא ל-Python לבני נוער',
    description:
      'קורס מבוא בן 8 שיעורים שמלמד את היסודות של Python דרך משחקים ויצירת בוט פשוט. אין צורך בידע קודם.',
    category: 'technology',
    level: 'beginner',
    language: 'he',
    total_minutes: 320,
    enrolled_count: 142,
    rating: 4.8,
    thumbnail_color: '#0d9488',
    instructor_id: U_RON,
    instructor_name: 'רון סילבר',
    status: 'approved',
    approved_by_org_id: 'org-c9a44100-8e7b-4f3a-a2d8-orot-tlv',
    created_at: '2026-02-15T10:00:00.000Z',
    lessons: [
      { id: 'L1', title: 'התקנה ועבודה בסביבה', duration_minutes: 30, has_quiz: false },
      { id: 'L2', title: 'משתנים, רשימות ותנאים', duration_minutes: 45, has_quiz: true },
      { id: 'L3', title: 'לולאות ופונקציות', duration_minutes: 50, has_quiz: true },
      { id: 'L4', title: 'עבודה עם קבצים', duration_minutes: 35, has_quiz: false },
      { id: 'L5', title: 'בקשות HTTP בסיסיות', duration_minutes: 40, has_quiz: true },
      { id: 'L6', title: 'בניית בוט טלגרם בסיסי', duration_minutes: 60, has_quiz: false },
      { id: 'L7', title: 'דיבאג ושיפור ביצועים', duration_minutes: 30, has_quiz: true },
      { id: 'L8', title: 'פרויקט מסכם', duration_minutes: 30, has_quiz: false },
    ],
  },
  {
    id: 'course-002',
    title: 'מתמטיקה לבגרות 4 יח״ל — מבוא',
    description:
      'סיכומים, דוגמאות פתורות ושיעורי הקלטה לכל הפרקים. מותאם לתלמידי כיתות י-יב.',
    category: 'education',
    level: 'intermediate',
    language: 'he',
    total_minutes: 540,
    enrolled_count: 386,
    rating: 4.9,
    thumbnail_color: '#6366f1',
    instructor_id: U_MOSHE,
    instructor_name: 'משה לוי',
    status: 'approved',
    created_at: '2026-01-20T09:00:00.000Z',
    lessons: [
      { id: 'L1', title: 'אלגברה — מערכות משוואות', duration_minutes: 60, has_quiz: true },
      { id: 'L2', title: 'גיאומטריה אנליטית', duration_minutes: 60, has_quiz: true },
      { id: 'L3', title: 'טריגונומטריה', duration_minutes: 75, has_quiz: true },
      { id: 'L4', title: 'נגזרות ופונקציות', duration_minutes: 90, has_quiz: true },
      { id: 'L5', title: 'אינטגרלים', duration_minutes: 90, has_quiz: true },
      { id: 'L6', title: 'הסתברות וסטטיסטיקה', duration_minutes: 75, has_quiz: true },
      { id: 'L7', title: 'הכנה למבחן מסכם', duration_minutes: 90, has_quiz: false },
    ],
  },
  {
    id: 'course-003',
    title: 'תרגילי פיזיותרפיה לגב התחתון',
    description:
      'סדרה של 6 שיעורי וידאו עם הסבר תרגול ביתי לכאב גב כרוני. כולל דגשים בטיחותיים.',
    category: 'medical',
    level: 'beginner',
    language: 'he',
    total_minutes: 180,
    enrolled_count: 248,
    rating: 4.7,
    thumbnail_color: '#f97316',
    instructor_id: U_ELI,
    instructor_name: 'אלי שלום',
    status: 'approved',
    created_at: '2025-11-10T14:00:00.000Z',
    lessons: [
      { id: 'L1', title: 'מבוא ובדיקת מצב', duration_minutes: 25, has_quiz: false },
      { id: 'L2', title: 'תרגילי שכיבה', duration_minutes: 30, has_quiz: false },
      { id: 'L3', title: 'תרגילי עמידה', duration_minutes: 30, has_quiz: false },
      { id: 'L4', title: 'הליכה ויציבות', duration_minutes: 30, has_quiz: false },
      { id: 'L5', title: 'הקפדה על עומס יומיומי', duration_minutes: 35, has_quiz: false },
      { id: 'L6', title: 'תכנית התמדה', duration_minutes: 30, has_quiz: false },
    ],
  },
  {
    id: 'course-004',
    title: 'יוגה לפנסיונרים — סדרת בוקר',
    description:
      '12 שיעורי וידאו של 20 דקות, מותאמים לכושר נמוך ולפעילות ביתית עם כיסא.',
    category: 'sports',
    level: 'beginner',
    language: 'he',
    total_minutes: 240,
    enrolled_count: 95,
    rating: 4.9,
    thumbnail_color: '#a855f7',
    instructor_id: U_TAMAR,
    instructor_name: 'תמר בלום',
    status: 'approved',
    created_at: '2026-03-01T08:00:00.000Z',
    lessons: [
      { id: 'L1', title: 'הצגת התרגול והנשימה', duration_minutes: 20, has_quiz: false },
      { id: 'L2', title: 'מתיחות בוקר', duration_minutes: 20, has_quiz: false },
      { id: 'L3', title: 'יוגה על כיסא — חלק 1', duration_minutes: 20, has_quiz: false },
      { id: 'L4', title: 'יוגה על כיסא — חלק 2', duration_minutes: 20, has_quiz: false },
    ],
  },
  {
    id: 'course-005',
    title: 'זכויות דיירים — מדריך מעשי',
    description:
      'קורס הסברה משפטי בסיסי על שכירות, חוזים, זכויות דיירים ומה לעשות בעת מחלוקת.',
    category: 'jobs',
    level: 'beginner',
    language: 'he',
    total_minutes: 150,
    enrolled_count: 72,
    rating: 4.6,
    thumbnail_color: '#0ea5e9',
    instructor_id: U_DAN,
    instructor_name: 'דן יפה',
    status: 'pending_review',
    created_at: '2026-04-22T15:00:00.000Z',
    lessons: [
      { id: 'L1', title: 'מבוא — חוק השכירות', duration_minutes: 30, has_quiz: false },
      { id: 'L2', title: 'חתימה על חוזה — מה לבדוק', duration_minutes: 35, has_quiz: true },
      { id: 'L3', title: 'תיקונים, פיקדון ועזיבה', duration_minutes: 40, has_quiz: true },
      { id: 'L4', title: 'מחלוקות וגישור', duration_minutes: 45, has_quiz: false },
    ],
  },
]

export const VISION_KNOWLEDGE_PRIVATE_LESSONS: KnowledgePrivateLesson[] = [
  {
    id: 'pl-001',
    title: 'עזרה בעברית לעולים חדשים',
    topic: 'שפות',
    city: 'ירושלים',
    format: 'in_person',
    duration_minutes: 60,
    weekly_slots: 3,
    teacher_id: U_RIVKA,
    teacher_name: 'רבקה כהן',
    rating: 4.9,
    status: 'approved',
  },
  {
    id: 'pl-002',
    title: 'שיעורי עזר במתמטיקה — תיכון',
    topic: 'חינוך',
    city: 'באר שבע',
    format: 'hybrid',
    duration_minutes: 45,
    weekly_slots: 5,
    teacher_id: U_MOSHE,
    teacher_name: 'משה לוי',
    rating: 4.8,
    status: 'approved',
  },
  {
    id: 'pl-003',
    title: 'יסודות עיצוב גרפי',
    topic: 'אמנות',
    city: 'תל אביב–יפו',
    format: 'remote',
    duration_minutes: 60,
    weekly_slots: 2,
    teacher_id: U_SHIRA,
    teacher_name: 'שירה גרין',
    rating: 4.7,
    status: 'approved',
  },
  {
    id: 'pl-004',
    title: 'שיעורי תכנות לבני נוער (Python)',
    topic: 'טכנולוגיה',
    city: 'תל אביב–יפו',
    format: 'remote',
    duration_minutes: 60,
    weekly_slots: 4,
    teacher_id: U_RON,
    teacher_name: 'רון סילבר',
    rating: 4.9,
    status: 'approved',
  },
  {
    id: 'pl-005',
    title: 'תמיכה רגשית — שיחה אחד-על-אחד',
    topic: 'בריאות נפש',
    city: 'חולון',
    format: 'remote',
    duration_minutes: 45,
    weekly_slots: 3,
    teacher_id: U_RACHEL,
    teacher_name: 'רחל סטון',
    rating: 5.0,
    status: 'approved',
  },
  {
    id: 'pl-006',
    title: 'ייעוץ קריירה — צעירים אחרי שירות',
    topic: 'קריירה',
    city: 'חיפה',
    format: 'hybrid',
    duration_minutes: 60,
    weekly_slots: 2,
    teacher_id: U_DAN,
    teacher_name: 'דן יפה',
    rating: 4.6,
    status: 'pending_review',
  },
]

export const VISION_KNOWLEDGE_ARTICLES: KnowledgeArticleVision[] = [
  {
    id: 'art-001',
    title: 'איך לזהות פנייה רגישה ולהפנות אותה למוקד',
    excerpt:
      'מדריך קצר למתנדבים — סימנים מקדימים, כללי שיח ופנייה למוקד שידוכים-טוב בלי לפגוע בפרטיות.',
    category: 'mental-health',
    reading_minutes: 6,
    author_id: U_RACHEL,
    author_name: 'רחל סטון',
    status: 'approved',
    published_at: '2026-04-15T12:00:00.000Z',
  },
  {
    id: 'art-002',
    title: 'שלושה כלים לתכנון תקציב חודשי לצעירים',
    excerpt:
      'אקסל פשוט, עיקרון ה-50/30/20 והתמודדות עם הוצאות בלתי צפויות. עם דוגמאות.',
    category: 'jobs',
    reading_minutes: 8,
    author_id: U_DAN,
    author_name: 'דן יפה',
    status: 'approved',
    published_at: '2026-03-28T09:00:00.000Z',
  },
  {
    id: 'art-003',
    title: 'מתכון משפחתי — 30 דק׳ לארוחה חמה',
    excerpt:
      'תבשיל אורז עם ירקות בעונה. כשר, פשוט, מתאים גם להגשה גדולה למשפחות נזקקות.',
    category: 'recipes',
    reading_minutes: 4,
    author_id: U_RIVKA,
    author_name: 'רבקה כהן',
    status: 'approved',
    published_at: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 'art-004',
    title: 'ארגונים קהילתיים פעילים בתל אביב — מפת חום',
    excerpt:
      'אינדקס שיתופי שמתעדכן מדי חודש: מי פעיל, באילו ימים ומה הצרכים העדכניים.',
    category: 'support',
    reading_minutes: 5,
    author_id: U_NOA,
    author_name: 'נועה שמעוני',
    status: 'approved',
    published_at: '2026-04-05T09:00:00.000Z',
  },
  {
    id: 'art-005',
    title: 'תזונה מאוזנת בתקציב מצומצם — 7 כללים',
    excerpt: 'איך לבחור חלבונים זולים, לקנות בעונה ולשמור על איזון תפריט שבועי.',
    category: 'food',
    reading_minutes: 7,
    author_id: U_ELI,
    author_name: 'אלי שלום',
    status: 'approved',
    published_at: '2026-04-10T12:00:00.000Z',
  },
  {
    id: 'art-006',
    title: 'מחשבה על נתינה: כשהעזרה לא מתפרסמת',
    excerpt:
      'על אנונימיות בקשות, צניעות בנתינה, וכבוד הדדי — דוגמאות מהמוקד הקהילתי.',
    category: 'support',
    reading_minutes: 9,
    author_id: U_NOA,
    author_name: 'נועה שמעוני',
    status: 'pending_review',
    published_at: '2026-04-25T16:00:00.000Z',
  },
]

export const VISION_KNOWLEDGE_VIDEOS: KnowledgeVideoVision[] = [
  {
    id: 'vid-001',
    title: 'הסבר 4 דק׳: איך פועל מערך המוקדנים בקהילה',
    category: 'support',
    duration: '04:18',
    url: 'https://example.org/videos/operators',
    source: 'internal',
    views: 1480,
    submitted_by_id: U_NOA,
    submitted_by_name: 'נועה שמעוני',
    status: 'approved',
    created_at: '2026-03-22T11:00:00.000Z',
  },
  {
    id: 'vid-002',
    title: 'מדיטציה מודרכת — 10 דקות לשקט בערב',
    category: 'mental-health',
    duration: '10:00',
    url: 'https://example.org/videos/meditation',
    source: 'internal',
    views: 3210,
    submitted_by_id: U_TAMAR,
    submitted_by_name: 'תמר בלום',
    status: 'approved',
    created_at: '2026-02-08T19:00:00.000Z',
  },
  {
    id: 'vid-003',
    title: 'סדנת תכנות בסיסית בעברית (קישור YouTube)',
    category: 'technology',
    duration: '32:14',
    url: 'https://www.youtube.com/watch?v=mock-1',
    source: 'youtube',
    views: 8400,
    submitted_by_id: U_RON,
    submitted_by_name: 'רון סילבר',
    status: 'approved',
    created_at: '2026-01-30T14:00:00.000Z',
  },
  {
    id: 'vid-004',
    title: '8 דקות יוגה לבוקר — מתאים לכולם',
    category: 'sports',
    duration: '08:42',
    url: 'https://example.org/videos/yoga-morning',
    source: 'internal',
    views: 2740,
    submitted_by_id: U_TAMAR,
    submitted_by_name: 'תמר בלום',
    status: 'approved',
    created_at: '2026-04-12T07:00:00.000Z',
  },
  {
    id: 'vid-005',
    title: 'איך מסתדרים ביום הראשון בעבודה חדשה (Vimeo)',
    category: 'jobs',
    duration: '12:30',
    url: 'https://vimeo.com/mock-1',
    source: 'vimeo',
    views: 612,
    submitted_by_id: U_DAN,
    submitted_by_name: 'דן יפה',
    status: 'pending_review',
    created_at: '2026-04-28T10:00:00.000Z',
  },
]

export const VISION_KNOWLEDGE_LINKS: KnowledgeLinkVision[] = [
  {
    id: 'kl-1',
    title: 'מדריך קצר לתזונה מאוזנת',
    url: 'https://example.org/nutrition',
    submitted_by_name: 'דנה רז',
    created_at: '2026-04-10T12:00:00.000Z',
  },
  {
    id: 'kl-2',
    title: 'ארגונים קהילתיים בתל אביב',
    url: 'https://example.org/community-tlv',
    submitted_by_name: 'נועה שמעוני',
    created_at: '2026-04-05T09:00:00.000Z',
  },
  {
    id: 'kl-3',
    title: 'שאלות נפוצות — שכירות וזכויות דיירים',
    url: 'https://example.org/tenant-rights',
    submitted_by_name: 'דן יפה',
    created_at: '2026-04-18T11:00:00.000Z',
  },
  {
    id: 'kl-4',
    title: 'מתכוני מטבח קהילתי — להורדה',
    url: 'https://example.org/community-recipes',
    submitted_by_name: 'רבקה כהן',
    created_at: '2026-03-12T14:00:00.000Z',
  },
]
