/**
 * Hebrew user-facing messages for Knowledge donation flows (SRS 02-03-donations).
 * Maps known API / client error strings from donations knowledge endpoints.
 */

const FALLBACK_LINK = 'שמירת הקישור נכשלה';
const FALLBACK_CONTRIBUTION = 'לא ניתן לשלוח את הבקשה כרגע';

export function mapKnowledgeCommunityLinkApiError(raw: string | undefined): string {
  if (!raw?.trim()) return FALLBACK_LINK;
  const s = raw.trim();
  if (/invalid url/i.test(s)) return 'הקישור אינו תקין';
  if (/url is required/i.test(s)) return 'נא להזין קישור תקף';
  if (/2048/i.test(s)) return 'הקישור ארוך מדי (עד 2048 תווים)';
  if (/network error/i.test(s)) return 'שגיאת רשת — בדקו את החיבור לאינטרנט';
  if (/timeout/i.test(s)) return 'תם הזמן לבקשה — נסו שוב';
  if (/failed to save knowledge link/i.test(s)) return FALLBACK_LINK;
  return s;
}

export function mapKnowledgeContributionApiError(raw: string | undefined): string {
  if (!raw?.trim()) return FALLBACK_CONTRIBUTION;
  const s = raw.trim();
  if (/ROOT_ADMIN|not configured|Server is not configured|missing ROOT_ADMIN_EMAIL/i.test(s)) {
    return 'השרת לא מוגדר (ROOT_ADMIN_EMAIL). פנו למנהל המערכת — לא ניתן לפתוח משימה כרגע.';
  }
  if (/authentication required/i.test(s)) return 'נדרשת התחברות';
  if (/message too long|4000/i.test(s)) return 'ההודעה ארוכה מדי (עד 4000 תווים)';
  if (/user profile not found/i.test(s)) return 'לא נמצא פרופיל משתמש';
  if (/failed to create knowledge contribution/i.test(s)) return 'יצירת המשימה נכשלה';
  if (/network error/i.test(s)) return 'שגיאת רשת — בדקו את החיבור לאינטרנט';
  if (/timeout/i.test(s)) return 'תם הזמן לבקשה — נסו שוב';
  if (/session expired/i.test(s) && /log in again/i.test(s)) {
    return 'ההרשאה פגה — התחברו מחדש';
  }
  return s;
}
