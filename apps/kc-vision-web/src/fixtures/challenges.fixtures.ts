/**
 * Mock challenges — covers PRD §3.9:
 *  - personal habit trackers (streaks, mood on reset)
 *  - community challenges (numeric / boolean / duration)
 *  - hybrid challenges (e.g. "5am club" group habit + chat)
 *  - leaderboards & daily check-ins
 */

const U_DANA = 'user-cd7712aa-5e44-4f2b-8c33-member-dana'
const U_YAEL = 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael'
const U_EITAN = 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad'
const U_DAVID = 'user-61bb90ee-3c22-4d50-a401-vol-david'
const U_RIVKA = 'user-77223344-5566-7788-senior-rivka'
const U_TAMAR = 'user-19'
const U_TOMER = 'user-90219876-aabb-ccdd-student-tomer'

export interface VisionPersonalChallenge {
  id: string
  user_id: string
  title: string
  description?: string
  category: 'health' | 'environment' | 'kindness' | 'learning' | 'mindfulness'
  unit: 'days' | 'hours' | 'count'
  streak_current: number
  streak_longest: number
  /** 1..5 — emotional snapshot at last broken-streak event (PRD §3.9.1). */
  last_reset_mood?: number
  last_reset_reason?: string
  next_check_in_at: string
}

export interface VisionCommunityChallenge {
  id: string
  title: string
  description: string
  category: string
  type: 'BOOLEAN' | 'NUMERIC' | 'DURATION'
  frequency: 'DAILY' | 'WEEKLY' | 'FLEXIBLE'
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  goal_direction: 'maximize' | 'minimize'
  goal_target: number
  goal_unit: string
  participants: number
  collective_progress: number
  ends_at: string
  created_by_user_id: string
}

/** Hybrid = personal habit performed inside a public group with shared chat. */
export interface VisionHybridChallenge {
  id: string
  title: string
  description: string
  members_count: number
  /** Members who already checked-in for *today*. */
  today_checked_in: number
  /** Loose check-in feed shown in the lobby. */
  recent_check_ins: Array<{
    user_id: string
    user_name: string
    at: string
    note?: string
  }>
  group_chat_id: string
  visibility: 'public' | 'private'
}

export interface VisionLeaderboardEntry {
  user_id: string
  name: string
  score: number
  rank: number
  delta_vs_last_week: number
}

export const VISION_PERSONAL_CHALLENGES: VisionPersonalChallenge[] = [
  {
    id: 'pc-1',
    user_id: U_DANA,
    title: 'הליכה יומית — 8,000 צעדים',
    description: 'מעודדת את עצמי לצאת אחרי הצהריים, גם אם עשרים דקות.',
    category: 'health',
    unit: 'days',
    streak_current: 5,
    streak_longest: 21,
    last_reset_mood: 2,
    last_reset_reason: 'יום עמוס בעבודה — לא יצאתי בכלל.',
    next_check_in_at: '2026-05-04T20:00:00.000Z',
  },
  {
    id: 'pc-2',
    user_id: U_YAEL,
    title: 'התנדבות שבועית קבועה',
    description: 'יום אחד בשבוע אצל קשישים — לא לדחות גם בשבוע עמוס.',
    category: 'kindness',
    unit: 'hours',
    streak_current: 3,
    streak_longest: 8,
    next_check_in_at: '2026-05-09T09:00:00.000Z',
  },
  {
    id: 'pc-3',
    user_id: U_DANA,
    title: 'שתיית 8 כוסות מים ביום',
    category: 'health',
    unit: 'days',
    streak_current: 12,
    streak_longest: 30,
    next_check_in_at: '2026-05-04T22:00:00.000Z',
  },
  {
    id: 'pc-4',
    user_id: U_YAEL,
    title: 'בלי טלפון בשעה הראשונה של היום',
    category: 'mindfulness',
    unit: 'days',
    streak_current: 2,
    streak_longest: 14,
    last_reset_mood: 3,
    last_reset_reason: 'נכנסתי בטעות לוואטסאפ קבוצתי.',
    next_check_in_at: '2026-05-05T07:00:00.000Z',
  },
  {
    id: 'pc-5',
    user_id: U_DAVID,
    title: 'קריאה לפני שינה (20 דק׳)',
    category: 'learning',
    unit: 'days',
    streak_current: 9,
    streak_longest: 18,
    next_check_in_at: '2026-05-04T23:00:00.000Z',
  },
  {
    id: 'pc-6',
    user_id: U_TAMAR,
    title: 'מדיטציה בוקר 10 דקות',
    category: 'mindfulness',
    unit: 'days',
    streak_current: 47,
    streak_longest: 47,
    next_check_in_at: '2026-05-05T06:30:00.000Z',
  },
  {
    id: 'pc-7',
    user_id: U_RIVKA,
    title: 'סריגה — שורה אחת ביום',
    category: 'kindness',
    unit: 'days',
    streak_current: 22,
    streak_longest: 60,
    next_check_in_at: '2026-05-04T19:00:00.000Z',
  },
  {
    id: 'pc-8',
    user_id: U_EITAN,
    title: 'הקלטת שיחת תודה אחת בשבוע',
    description: 'משאיר הודעה קולית למישהו שעזר השבוע.',
    category: 'kindness',
    unit: 'count',
    streak_current: 4,
    streak_longest: 12,
    next_check_in_at: '2026-05-08T18:00:00.000Z',
  },
]

export const VISION_COMMUNITY_CHALLENGES: VisionCommunityChallenge[] = [
  {
    id: 'cc-1',
    title: '10,000 צעדים ביום',
    description: 'אתגר חודשי — נספור צעדים עד סוף מאי. כל יום נצבר ללוח המובילים.',
    category: 'sports',
    type: 'NUMERIC',
    frequency: 'DAILY',
    difficulty: 'medium',
    goal_direction: 'maximize',
    goal_target: 300000,
    goal_unit: 'צעדים',
    participants: 128,
    collective_progress: 184320,
    ends_at: '2026-05-31T23:59:59.000Z',
    created_by_user_id: U_TAMAR,
  },
  {
    id: 'cc-2',
    title: 'יום בלי פלסטיק חד-פעמי',
    description: 'יום בשבוע שבו כולנו מנסים להימנע משימוש בכלים חד-פעמיים.',
    category: 'environment',
    type: 'BOOLEAN',
    frequency: 'WEEKLY',
    difficulty: 'easy',
    goal_direction: 'maximize',
    goal_target: 4,
    goal_unit: 'שבועות',
    participants: 64,
    collective_progress: 2,
    ends_at: '2026-05-31T23:59:59.000Z',
    created_by_user_id: U_DANA,
  },
  {
    id: 'cc-3',
    title: '1,000 סלי מזון לחודש',
    description: 'יעד קהילתי — נצבר תרומות של אוכל לאורך מאי. לכל 5 ק"ג נצבירה.',
    category: 'food',
    type: 'NUMERIC',
    frequency: 'FLEXIBLE',
    difficulty: 'hard',
    goal_direction: 'maximize',
    goal_target: 1000,
    goal_unit: 'סלים',
    participants: 318,
    collective_progress: 612,
    ends_at: '2026-05-31T23:59:59.000Z',
    created_by_user_id: U_EITAN,
  },
  {
    id: 'cc-4',
    title: '100 שעות התנדבות עם קשישים',
    description: 'יעד שבועי לצוות "אורות" — שעות מצטברות עם וותיקי השכונה.',
    category: 'time',
    type: 'DURATION',
    frequency: 'WEEKLY',
    difficulty: 'medium',
    goal_direction: 'maximize',
    goal_target: 100,
    goal_unit: 'שעות',
    participants: 22,
    collective_progress: 73,
    ends_at: '2026-05-12T23:59:59.000Z',
    created_by_user_id: U_YAEL,
  },
  {
    id: 'cc-5',
    title: 'מבחן בריאות הנפש — שבוע נטו',
    description: 'שבוע של דיווח רגשי יומי + אזכור אדם אחד שעזר לנו.',
    category: 'mental-health',
    type: 'BOOLEAN',
    frequency: 'DAILY',
    difficulty: 'easy',
    goal_direction: 'maximize',
    goal_target: 7,
    goal_unit: 'ימים',
    participants: 89,
    collective_progress: 4,
    ends_at: '2026-05-11T23:59:59.000Z',
    created_by_user_id: U_TAMAR,
  },
  {
    id: 'cc-6',
    title: '50 מסירות חפצים השבוע',
    description: 'מתחילים לפנות מקום בארונות — כל חפץ שנמסר בהצלחה נספר.',
    category: 'items',
    type: 'NUMERIC',
    frequency: 'WEEKLY',
    difficulty: 'easy',
    goal_direction: 'maximize',
    goal_target: 50,
    goal_unit: 'חפצים',
    participants: 47,
    collective_progress: 31,
    ends_at: '2026-05-10T23:59:59.000Z',
    created_by_user_id: U_RIVKA,
  },
]

export const VISION_HYBRID_CHALLENGES: VisionHybridChallenge[] = [
  {
    id: 'hc-1',
    title: 'מועדון 5 בבוקר',
    description:
      'מתעוררים יחד ב-05:00 ומדווחים בצ\'אט קבוצתי. 6 ימים בשבוע, מי שמפספס משאיר הודעה רגשית.',
    members_count: 1212,
    today_checked_in: 743,
    recent_check_ins: [
      {
        user_id: U_TAMAR,
        user_name: 'תמר בלום',
        at: '2026-05-04T05:02:00.000Z',
        note: 'בוקר טוב מהרצליה — קמה עם השמש 🌅',
      },
      {
        user_id: U_DAVID,
        user_name: 'דוד הלל',
        at: '2026-05-04T05:08:00.000Z',
        note: 'נהיה רגיל פתאום',
      },
      {
        user_id: U_DANA,
        user_name: 'דנה רז',
        at: '2026-05-04T05:14:00.000Z',
      },
      {
        user_id: U_YAEL,
        user_name: 'יעל מזרחי',
        at: '2026-05-04T05:20:00.000Z',
        note: 'יום שני קל יותר משבת',
      },
    ],
    group_chat_id: 'conv-hybrid-5am',
    visibility: 'public',
  },
  {
    id: 'hc-2',
    title: 'שבוע ללא אריזות מיותרות',
    description: 'מצמצמים יחד פסולת. כל אחד מצלם פעולה אחת ביום.',
    members_count: 184,
    today_checked_in: 92,
    recent_check_ins: [
      {
        user_id: U_DANA,
        user_name: 'דנה רז',
        at: '2026-05-04T08:00:00.000Z',
        note: 'קופה משלי במכולת ✨',
      },
      {
        user_id: U_TOMER,
        user_name: 'תומר וייס',
        at: '2026-05-04T07:42:00.000Z',
      },
    ],
    group_chat_id: 'conv-hybrid-zerowaste',
    visibility: 'public',
  },
  {
    id: 'hc-3',
    title: '21 ימים של תרגול עברית עם עולים',
    description: 'מתנדבים מתאמים שיחה יומית של 15 דק׳ עם תושב חדש בארץ.',
    members_count: 56,
    today_checked_in: 18,
    recent_check_ins: [
      {
        user_id: U_RIVKA,
        user_name: 'רבקה כהן',
        at: '2026-05-04T11:00:00.000Z',
        note: 'דיברנו על חגים — היה כיף!',
      },
    ],
    group_chat_id: 'conv-hybrid-hebrew',
    visibility: 'private',
  },
]

export const VISION_LEADERBOARD: VisionLeaderboardEntry[] = [
  {
    user_id: U_EITAN,
    name: 'איתן בר',
    score: 1840,
    rank: 1,
    delta_vs_last_week: 0,
  },
  {
    user_id: U_YAEL,
    name: 'יעל מזרחי',
    score: 1620,
    rank: 2,
    delta_vs_last_week: 1,
  },
  {
    user_id: U_DANA,
    name: 'דנה רז',
    score: 1485,
    rank: 3,
    delta_vs_last_week: -1,
  },
  {
    user_id: U_TAMAR,
    name: 'תמר בלום',
    score: 1340,
    rank: 4,
    delta_vs_last_week: 2,
  },
  {
    user_id: U_RIVKA,
    name: 'רבקה כהן',
    score: 1210,
    rank: 5,
    delta_vs_last_week: 0,
  },
  {
    user_id: U_DAVID,
    name: 'דוד הלל',
    score: 980,
    rank: 6,
    delta_vs_last_week: 3,
  },
  {
    user_id: U_TOMER,
    name: 'תומר וייס',
    score: 740,
    rank: 7,
    delta_vs_last_week: -2,
  },
]
