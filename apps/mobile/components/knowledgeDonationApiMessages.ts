/**
 * Maps API error strings for knowledge donation flows to short Hebrew messages for toasts.
 */

function norm(s: string | undefined): string {
  return (s ?? '').trim();
}

export function mapKnowledgeContributionApiError(raw: string | undefined): string {
  const e = norm(raw);
  if (!e) {
    return 'שגיאה בשליחת הבקשה. נסו שוב.';
  }
  const lower = e.toLowerCase();

  if (lower.includes('root_admin') || lower.includes('not configured')) {
    return 'המערכת לא מוגדרת לקבל בקשות תרומת מידע כרגע. פנו לתמיכה או נסו מאוחר יותר.';
  }
  if (
    lower.includes('principal admin') ||
    lower.includes('user_profiles') ||
    lower.includes('task assignment')
  ) {
    return 'לא נמצא חשבון מנהל ראשי במערכת לשיוך המשימה. פנו לתמיכה.';
  }
  if (lower.includes('authentication') || lower.includes('unauthorized') || e.includes('401')) {
    return 'התחברו כדי לשלוח בקשה.';
  }
  if (lower.includes('message too long') || lower.includes('4000')) {
    return 'ההודעה ארוכה מדי (עד 4000 תווים).';
  }
  if (lower.includes('user profile not found') || lower.includes('profile not found')) {
    return 'פרופיל המשתמש לא נמצא. נסו להתחבר מחדש.';
  }
  if (lower.includes('timeout') || lower.includes('not responding')) {
    return 'פג הזמן לשרת. נסו שוב בעוד רגע.';
  }
  if (lower.includes('network') || lower.includes('connection')) {
    return 'בעיית רשת. בדקו את החיבור ונסו שוב.';
  }

  return e.length > 180 ? `${e.slice(0, 177)}…` : e;
}

export function mapKnowledgeCommunityLinkApiError(raw: string | undefined): string {
  const e = norm(raw);
  if (!e) {
    return 'שגיאה בשמירת הקישור. נסו שוב.';
  }
  const lower = e.toLowerCase();

  if (lower === 'invalid url' || lower.includes('invalid url')) {
    return 'כתובת הקישור אינה תקינה.';
  }
  if (lower.includes('url is required') || lower.includes('required')) {
    return 'נדרשת כתובת קישור תקינה.';
  }
  if (lower.includes('timeout') || lower.includes('not responding')) {
    return 'פג הזמן לשרת. נסו שוב בעוד רגע.';
  }
  if (lower.includes('network') || lower.includes('connection')) {
    return 'בעיית רשת. בדקו את החיבור ונסו שוב.';
  }

  return e.length > 180 ? `${e.slice(0, 177)}…` : e;
}
