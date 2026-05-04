import type { VisionOrganization } from '../types'

/**
 * Small set of believable organizations — quality over quantity.
 * IDs are stable strings for fixture references.
 */
export const VISION_ORGANIZATIONS: VisionOrganization[] = [
  {
    id: 'org-bb16e8a2-4f2c-4c6b-9c1d-hands-netanya',
    name: 'עמותת יד ביד — נתניה והסביבה',
    short_name: 'יד ביד נתניה',
    description:
      'מזון חם, סלי מזון וליווי קבוע למשפחות במצוקה ולקשישים בודדים באזור השרון. ' +
      'המתנדבים שלנו עובדים בשיתוף עם רווחה ומוקדי חירום קהילתיים; אנחנו מתמקדים בשקיפות, בזמני תגובה קצרים ובשומרים על כבוד האדם בכל ביקור.',
    logo_url: undefined,
    website: 'https://yad-beyad.example.org.il',
    contact_email: 'mitnadvim@yad-beyad.example.org.il',
    phone: '+972-9-555-2103',
    address: 'רחוב האקליפטוס 14',
    city: 'נתניה',
    country: 'Israel',
    type: 'ngo',
    status: 'active',
    created_by_user_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    affiliated_volunteers_count: 48,
  },
  {
    id: 'org-c9a44100-8e7b-4f3a-a2d8-orot-tlv',
    name: 'מרכז קהילתי "אורות" — תל אביב',
    short_name: 'אורות ת״א',
    description:
      'מרכז עירוני לחיבור דורות: חוגים לנוער, קפה לקשישים, שיעורי עברית לעולים וצוות קהילתי שמלווה משפחות בשיקום כלכלי. ' +
      'מנהלי הארגון עובדים מול העירייה ועם עמותות שכנות כדי למנוע כפילויות ולרכז הפניות.',
    logo_url: undefined,
    website: 'https://orot-tlv.example.muni.il',
    contact_email: 'info@orot-tlv.example.muni.il',
    phone: '+972-3-555-7741',
    address: 'שדרות רוטשילד 45',
    city: 'תל אביב–יפו',
    country: 'Israel',
    type: 'community_center',
    status: 'active',
    created_by_user_id: 'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    affiliated_volunteers_count: 112,
  },
  {
    id: 'org-f5019dbe-1a88-4c7c-b9f5-shiduchim-hub',
    name: 'מוקד שידוכים טוב — יחידת תיאום ארצית',
    short_name: 'שידוכים טוב',
    description:
      'תא גיבוי אנושי לבקשות רגישות מהפיד: מפעילים מאמתים צורך, מתעדים בהסכמה, ומחברים בין משתמשים למתנדבים ולגורמים מתאימים. ' +
      'הגישה מקצועית ומבוקרת; אין החלטות אוטומטיות — רק התאמות מודעות פרטיות.',
    logo_url: undefined,
    website: undefined,
    contact_email: 'ops@shiduchim.internal.example',
    phone: '+972-77-555-0199',
    address: 'מתחם משרדים (לא פתוח לקהל)',
    city: 'הרצליה',
    country: 'Israel',
    type: 'internal_unit',
    status: 'active',
    created_by_user_id: 'user-11001100-1100-1100-1100-superadmin',
    affiliated_volunteers_count: 0,
  },
]
