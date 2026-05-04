/**
 * Mock saved items / bookmarks (PRD §3.13).
 * Items live across many entity types and are pinned to the acting persona.
 */

const U_DANA = 'user-cd7712aa-5e44-4f2b-8c33-member-dana'
const U_YAEL = 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael'
const U_TOMER = 'user-90219876-aabb-ccdd-student-tomer'

export type BookmarkKind =
  | 'post'
  | 'ride'
  | 'item'
  | 'challenge'
  | 'course'
  | 'organization'

export interface VisionBookmark {
  id: string
  user_id: string
  kind: BookmarkKind
  title: string
  subtitle: string
  /** Internal route for navigation. */
  link: string
  saved_at: string
}

export const VISION_BOOKMARKS: VisionBookmark[] = [
  {
    id: 'bm-1',
    user_id: U_DANA,
    kind: 'post',
    title: 'מזון יבש לחורף — מוכן לאיסוף',
    subtitle: 'דנה רז · קטגוריה: מזון',
    link: '/feed',
    saved_at: '2026-05-04T07:30:00.000Z',
  },
  {
    id: 'bm-2',
    user_id: U_DANA,
    kind: 'ride',
    title: 'נתניה ↔ תל אביב — 06.05 ב-16:00',
    subtitle: 'יעל מזרחי · 2 מקומות פנויים · ליווי לרופא',
    link: '/rides/ride-002',
    saved_at: '2026-05-03T09:00:00.000Z',
  },
  {
    id: 'bm-3',
    user_id: U_DANA,
    kind: 'item',
    title: 'ספרי ילדים (ארגז)',
    subtitle: 'דנה רז · רמת גן · במצב מצוין',
    link: '/items/item-002',
    saved_at: '2026-05-02T20:00:00.000Z',
  },
  {
    id: 'bm-4',
    user_id: U_DANA,
    kind: 'challenge',
    title: 'מועדון 5 בבוקר',
    subtitle: '1212 משתתפים · אתגר היברידי',
    link: '/challenges',
    saved_at: '2026-05-02T05:30:00.000Z',
  },
  {
    id: 'bm-5',
    user_id: U_DANA,
    kind: 'course',
    title: 'יוגה לפנסיונרים — סדרת בוקר',
    subtitle: 'תמר בלום · 12 שיעורים · רייטינג 4.9',
    link: '/donations/knowledge',
    saved_at: '2026-05-01T18:00:00.000Z',
  },
  {
    id: 'bm-6',
    user_id: U_DANA,
    kind: 'organization',
    title: 'מרכז קהילתי "אורות" — תל אביב',
    subtitle: '112 מתנדבים פעילים',
    link: '/discover',
    saved_at: '2026-04-29T11:00:00.000Z',
  },
  {
    id: 'bm-7',
    user_id: U_YAEL,
    kind: 'post',
    title: 'הסעה לבית חולים — כל יום שני',
    subtitle: 'אבי בן דוד · נסיעות',
    link: '/feed',
    saved_at: '2026-05-03T08:00:00.000Z',
  },
  {
    id: 'bm-8',
    user_id: U_YAEL,
    kind: 'challenge',
    title: '100 שעות התנדבות עם קשישים',
    subtitle: '22 משתתפים · יעד שבועי',
    link: '/challenges',
    saved_at: '2026-05-02T07:00:00.000Z',
  },
  {
    id: 'bm-9',
    user_id: U_YAEL,
    kind: 'item',
    title: 'מקרר קטן למשרד',
    subtitle: 'איתן בר · נתניה',
    link: '/items/item-001',
    saved_at: '2026-05-01T16:00:00.000Z',
  },
  {
    id: 'bm-10',
    user_id: U_TOMER,
    kind: 'organization',
    title: 'מרכז קהילתי "אורות" — תל אביב',
    subtitle: 'מעוניין להצטרף כמתנדב סופ"ש',
    link: '/discover',
    saved_at: '2026-05-01T17:30:00.000Z',
  },
  {
    id: 'bm-11',
    user_id: U_TOMER,
    kind: 'course',
    title: 'מבוא ל-Python לבני נוער',
    subtitle: 'רון סילבר · 8 שיעורים',
    link: '/donations/knowledge',
    saved_at: '2026-04-30T19:00:00.000Z',
  },
]
