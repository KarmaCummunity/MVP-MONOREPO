/**
 * Mock notifications — POC fake data, not driven by any backend.
 * Covers all PRD §3.12 categories: action_required, updates, reminders, system.
 */
export type VisionNotificationType =
  | 'like'
  | 'comment'
  | 'follower'
  | 'ride_request'
  | 'ride_approved'
  | 'item_request'
  | 'item_approved'
  | 'match_proposal'
  | 'match_accepted'
  | 'operator_new_queue_item'
  | 'operator_candidate_response'
  | 'challenge_reminder'
  | 'challenge_milestone'
  | 'donation_thanks'
  | 'profile_reminder'
  | 'org_invite'
  | 'volunteer_application'
  | 'system'

export type VisionNotificationCategory =
  | 'action_required'
  | 'updates'
  | 'reminders'
  | 'system'

export interface VisionNotification {
  id: string
  user_id: string
  type: VisionNotificationType
  category: VisionNotificationCategory
  title: string
  body: string
  read: boolean
  created_at: string
  /** optional client-side route to navigate to when the user taps the item */
  link?: string
  /** display avatar/icon hint */
  actor_id?: string
}

const U_DANA = 'user-cd7712aa-5e44-4f2b-8c33-member-dana'
const U_YAEL = 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael'
const U_EITAN = 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad'
const U_DAVID = 'user-61bb90ee-3c22-4d50-a401-vol-david'
const U_MICHAL = 'user-b203d4ae-6f10-4d8c-9e01-operator-michal'
const U_NOA = 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot'
const U_NADAV = 'user-f109eeda-2b8c-4a11-9f12-admin-nadav'
const U_TOMER = 'user-90219876-aabb-ccdd-student-tomer'

/** ~28 notifications spread across personas and categories. */
export const VISION_NOTIFICATIONS: VisionNotification[] = [
  {
    id: 'n-001',
    user_id: U_MICHAL,
    type: 'operator_new_queue_item',
    category: 'action_required',
    title: 'פנייה חדשה בתור התאמה',
    body: 'בקשת עזרה רגישה בקטגוריה: בריאות נפש · פתח תקווה · דחיפות בינונית.',
    read: false,
    created_at: '2026-05-04T08:50:00.000Z',
    link: '/donations/shiduchim-tov/queue',
  },
  {
    id: 'n-002',
    user_id: U_MICHAL,
    type: 'operator_candidate_response',
    category: 'updates',
    title: 'מועמד אישר הצעת התאמה',
    body: 'נועה אישרה את ההצעה לתיק #C-1042. נחוצה החלטה לסגירה הדדית.',
    read: false,
    created_at: '2026-05-04T07:12:00.000Z',
    actor_id: U_NOA,
    link: '/donations/shiduchim-tov/cases/case-1',
  },
  {
    id: 'n-003',
    user_id: U_DANA,
    type: 'match_proposal',
    category: 'action_required',
    title: 'הצעת התאמה ממוקדן',
    body: 'מוקדנית מצאה מתנדבת מתאימה לבקשתך. נא לאשר או לדחות בתוך 24 שעות.',
    read: false,
    created_at: '2026-05-04T06:30:00.000Z',
    actor_id: U_MICHAL,
    link: '/notifications',
  },
  {
    id: 'n-004',
    user_id: U_DANA,
    type: 'like',
    category: 'updates',
    title: 'יעל אהבה את הפוסט שלך',
    body: '"מחפשת כיסא גבוה לפעוט — עדיף משומש"',
    read: true,
    created_at: '2026-05-03T19:00:00.000Z',
    actor_id: U_YAEL,
    link: '/feed',
  },
  {
    id: 'n-005',
    user_id: U_DANA,
    type: 'comment',
    category: 'updates',
    title: 'תגובה חדשה על הפוסט שלך',
    body: 'איתן: "יש לנו אחד שחיכה לבית — אשלח פרטים בצ\'אט."',
    read: true,
    created_at: '2026-05-03T18:42:00.000Z',
    actor_id: U_EITAN,
    link: '/feed',
  },
  {
    id: 'n-006',
    user_id: U_DANA,
    type: 'follower',
    category: 'updates',
    title: 'יש לך עוקבת חדשה',
    body: 'מרים כץ עוקבת אחרייך — מחנכת ומעבירה חוגים בכפר סבא.',
    read: false,
    created_at: '2026-05-03T15:00:00.000Z',
    link: '/discover',
  },
  {
    id: 'n-007',
    user_id: U_YAEL,
    type: 'ride_request',
    category: 'action_required',
    title: 'בקשת הצטרפות לנסיעה',
    body: 'דנה ביקשה להצטרף לנסיעה נתניה → תל אביב ב-06.05 ב-16:00.',
    read: false,
    created_at: '2026-05-03T14:10:00.000Z',
    actor_id: U_DANA,
    link: '/rides/ride-002',
  },
  {
    id: 'n-008',
    user_id: U_DANA,
    type: 'ride_approved',
    category: 'updates',
    title: 'יעל אישרה את ההצטרפות לנסיעה',
    body: 'נסיעה: נתניה → חדרה ב-05.05 בשעה 07:30. אסוף מתחנת אוטובוס מרכזית.',
    read: true,
    created_at: '2026-05-03T13:20:00.000Z',
    actor_id: U_YAEL,
    link: '/rides/ride-001',
  },
  {
    id: 'n-009',
    user_id: U_YAEL,
    type: 'item_request',
    category: 'action_required',
    title: 'בקשה לחפץ שפרסמת',
    body: 'דנה ביקשה את "ספרי ילדים (ארגז)". מומלץ לאשר את המסירה.',
    read: false,
    created_at: '2026-05-03T11:40:00.000Z',
    actor_id: U_DANA,
    link: '/items/item-002',
  },
  {
    id: 'n-010',
    user_id: U_DAVID,
    type: 'item_approved',
    category: 'updates',
    title: 'מסירת חפץ אושרה',
    body: 'איתן אישר לך את "מקרר קטן למשרד" — תאם איסוף ב-25 שעות הקרובות.',
    read: false,
    created_at: '2026-05-03T10:00:00.000Z',
    actor_id: U_EITAN,
    link: '/items/item-001',
  },
  {
    id: 'n-011',
    user_id: U_DANA,
    type: 'challenge_reminder',
    category: 'reminders',
    title: 'תזכורת אתגר יומי',
    body: '"הליכה יומית" — לא דיווחת היום עדיין. הרצף הנוכחי שלך הוא 5 ימים.',
    read: false,
    created_at: '2026-05-04T07:00:00.000Z',
    link: '/challenges',
  },
  {
    id: 'n-012',
    user_id: U_YAEL,
    type: 'challenge_milestone',
    category: 'updates',
    title: 'הגעת לאבן דרך באתגר!',
    body: 'אתגר "התנדבות שבועית" — שבוע שלישי ברציפות. כל הכבוד!',
    read: true,
    created_at: '2026-05-02T20:00:00.000Z',
    link: '/challenges',
  },
  {
    id: 'n-013',
    user_id: U_DANA,
    type: 'profile_reminder',
    category: 'reminders',
    title: 'השלימי את אימות הזהות',
    body: 'העלאת ת"ז תעניק לך "וי כחול" ותחזק את האמינות שלך בקהילה.',
    read: false,
    created_at: '2026-05-02T09:00:00.000Z',
    link: '/profile',
  },
  {
    id: 'n-014',
    user_id: U_DANA,
    type: 'donation_thanks',
    category: 'updates',
    title: 'תודה על תרומתך',
    body: 'תרומה חודשית של 200 ₪ ל"אורות תל אביב" התקבלה בהצלחה. קבלה דיגיטלית נשלחה במייל.',
    read: true,
    created_at: '2026-05-01T08:00:00.000Z',
    link: '/donations',
  },
  {
    id: 'n-015',
    user_id: U_TOMER,
    type: 'org_invite',
    category: 'action_required',
    title: 'הזמנה להצטרף כמתנדב',
    body: 'מרכז "אורות" מזמין אותך להצטרף כמתנדב סוף שבוע. תפקיד מוצע: סייע באירועי קהילה.',
    read: false,
    created_at: '2026-05-01T17:00:00.000Z',
    actor_id: U_NOA,
    link: '/profile',
  },
  {
    id: 'n-016',
    user_id: U_NOA,
    type: 'volunteer_application',
    category: 'action_required',
    title: 'בקשת התנדבות חדשה',
    body: 'תומר וייס (חיפה, סטודנט לרפואה) ביקש להצטרף כמתנדב לעמותה. ממתין לאישור.',
    read: false,
    created_at: '2026-05-01T16:30:00.000Z',
    actor_id: U_TOMER,
    link: '/admin',
  },
  {
    id: 'n-017',
    user_id: U_EITAN,
    type: 'volunteer_application',
    category: 'action_required',
    title: 'בקשת התנדבות חדשה',
    body: 'דן יפה (סטודנט למשפטים, ירושלים) הגיש בקשת הצטרפות לצוות.',
    read: false,
    created_at: '2026-04-30T10:00:00.000Z',
    link: '/admin',
  },
  {
    id: 'n-018',
    user_id: U_NADAV,
    type: 'system',
    category: 'system',
    title: 'דיווח חדש על תוכן',
    body: 'משתמש דיווח על פוסט "[מוסתר] פוסט לבדיקה". ממתין לבחינה במערכת המודרציה.',
    read: false,
    created_at: '2026-04-30T15:30:00.000Z',
    link: '/admin',
  },
  {
    id: 'n-019',
    user_id: U_NADAV,
    type: 'system',
    category: 'system',
    title: 'בקשת ארגון חדש להצטרפות',
    body: 'עמותת "אור לחיינו" מהרצליה מבקשת לפתוח חשבון בפלטפורמה.',
    read: false,
    created_at: '2026-04-29T09:00:00.000Z',
    link: '/admin',
  },
  {
    id: 'n-020',
    user_id: U_DANA,
    type: 'comment',
    category: 'updates',
    title: 'תגובה חדשה על הפוסט שלך',
    body: 'אבי: "אני נוסע לבית חולים בילינסון ביום שני — אם זה עוזר."',
    read: true,
    created_at: '2026-04-28T14:20:00.000Z',
    link: '/feed',
  },
  {
    id: 'n-021',
    user_id: U_YAEL,
    type: 'follower',
    category: 'updates',
    title: 'דוד הלל עוקב אחרייך',
    body: 'סטודנט להנדסה מהרצליה — מתנדב מחסן ב"יד ביד נתניה".',
    read: true,
    created_at: '2026-04-27T11:00:00.000Z',
    actor_id: U_DAVID,
    link: '/discover',
  },
  {
    id: 'n-022',
    user_id: U_DANA,
    type: 'challenge_reminder',
    category: 'reminders',
    title: 'אתגר קהילתי: 5 בבוקר',
    body: 'דיווח יומי פתוח עד 09:00. הצוות שלך כבר התעורר 7 מתוך 12 חברים.',
    read: false,
    created_at: '2026-05-04T05:00:00.000Z',
    link: '/challenges',
  },
  {
    id: 'n-023',
    user_id: U_DANA,
    type: 'system',
    category: 'system',
    title: 'תחזוקה מתוכננת',
    body: 'תחזוקה קצרה צפויה ביום ו׳ בין 02:00 ל-02:30. ייתכן עיכוב קצר בעדכוני פיד.',
    read: true,
    created_at: '2026-04-25T20:00:00.000Z',
  },
  {
    id: 'n-024',
    user_id: U_EITAN,
    type: 'comment',
    category: 'updates',
    title: 'תגובה חדשה על "סיכום פעילות אפריל"',
    body: 'רחל: "כל הכבוד לצוות — אנחנו ב\'אורות\' שמחות לשתף פעולה בחודש הבא."',
    read: true,
    created_at: '2026-04-24T18:00:00.000Z',
    actor_id: U_NOA,
    link: '/feed',
  },
  {
    id: 'n-025',
    user_id: U_DANA,
    type: 'donation_thanks',
    category: 'updates',
    title: 'התרומה שלך עברה למוטב',
    body: 'התרומה ל"יד ביד נתניה" סיפקה 14 סלי מזון השבוע. תודה!',
    read: true,
    created_at: '2026-04-23T10:00:00.000Z',
    link: '/donations',
  },
  {
    id: 'n-026',
    user_id: U_NOA,
    type: 'system',
    category: 'system',
    title: 'תזכורת: מנוי ארגון מסתיים בקרוב',
    body: 'המנוי החודשי לעריכת פרופיל הארגון יחודש אוטומטית ב-12.05.',
    read: false,
    created_at: '2026-04-22T08:00:00.000Z',
    link: '/admin',
  },
  {
    id: 'n-027',
    user_id: U_YAEL,
    type: 'challenge_milestone',
    category: 'updates',
    title: 'מקום 2 בלוח המובילים!',
    body: 'באתגר "10,000 צעדים ביום" עברת את דנה. 1620 נקודות סך הכל.',
    read: true,
    created_at: '2026-04-21T22:00:00.000Z',
    link: '/challenges',
  },
  {
    id: 'n-028',
    user_id: U_DANA,
    type: 'system',
    category: 'system',
    title: 'עדכון מדיניות פרטיות',
    body: 'הוספנו אפשרות לבחירה אוטומטית של רמת אנונימיות בעת פרסום בקטגוריות רגישות.',
    read: true,
    created_at: '2026-04-20T09:00:00.000Z',
  },
]
