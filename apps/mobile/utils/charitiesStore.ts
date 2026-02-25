export type CharityCategoryId =
  | 'money'
  | 'time'
  | 'knowledge'
  | 'food'
  | 'clothes'
  | 'books'
  | 'furniture'
  | 'medical'
  | 'animals'
  | 'housing'
  | 'support'
  | 'education'
  | 'environment'
  | 'technology';

export interface CharityRecord {
  id: string; // unique stable id (can be slug or guid)
  name: string;
  url?: string;
  description?: string;
  categories?: CharityCategoryId[]; // one or more categories
  tags?: string[]; // free-form meta tags
  logoUrl?: string;
  contact?: {
    phone?: string;
    email?: string;
    facebook?: string;
    instagram?: string;
  };
  location?: {
    city?: string;
    region?: string;
    address?: string;
  };
}

// Core, verified charities (initial seed). Hebrew-first descriptions.
export const charitiesStore: CharityRecord[] = [
  // Aggregator
  {
    id: 'guidestar_il',
    name: 'גיידסטאר ישראל',
    url: 'https://www.guidestar.org.il/home',
    description: 'מאגר רשמי של עמותות וחברות לתועלת הציבור בישראל. מאפשר חיפוש ובדיקת עמותות ברמה הלאומית.',
    categories: ['knowledge', 'money', 'time', 'support'],
    tags: ['אגרגטור', 'רשמי', 'רגולציה', 'חיפוש עמותות'],
    logoUrl: undefined,
  },

  // Food
  {
    id: 'leket_israel',
    name: 'לקט ישראל',
    url: 'https://www.leket.org/',
    description: 'בנק המזון הלאומי: הצלת עודפי מזון איכותיים והעברתם לנזקקים.',
    categories: ['food'],
    tags: ['מזון', 'רווחה'],
  },
  {
    id: 'latet',
    name: 'לתת',
    url: 'https://www.latet.org.il/',
    description: 'סיוע הומניטרי, חלוקת מזון ותמיכה חברתית.',
    categories: ['food', 'housing', 'support'],
    tags: ['מזון', 'רווחה', 'חבילות'],
  },
  {
    id: 'bly',
    name: 'בית לחם יהודה',
    url: 'https://www.bly.org.il/',
    description: 'חלוקת מזון, מוצרי ניקיון וסיוע למשפחות במצוקה.',
    categories: ['food'],
    tags: ['מזון', 'רווחה'],
  },
  {
    id: 'food_for_life',
    name: 'מזון לחיים',
    url: 'https://www.food-for-life.org/',
    description: 'הצלת מזון, אימוץ משפחות והאכלת נזקקים.',
    categories: ['food'],
    tags: ['מזון'],
  },
  {
    id: 'yad_ezra_shulamit',
    name: 'יד עזרה ושולמית',
    url: 'https://yadezra.org.il/',
    description: 'חלוקת מזון למשפחות במצוקה ולחיילים.',
    categories: ['food'],
    tags: ['מזון', 'רווחה'],
  },

  // Medical
  {
    id: 'yad_sarah',
    name: 'יד שרה',
    url: 'https://www.yadsarah.org.il/',
    description: 'השאלת ציוד רפואי ושירותים תומכים לחולים ולמשפחותיהם.',
    categories: ['medical', 'furniture', 'clothes'],
    tags: ['בריאות', 'ציוד רפואי'],
  },
  {
    id: 'haverim_lesrefa',
    name: 'חברים לרפואה',
    url: 'https://www.haverim.org.il/',
    description: 'סיוע בתרופות ומכשור רפואי לאנשים במצוקה.',
    categories: ['medical'],
    tags: ['בריאות', 'תרופות'],
  },
  {
    id: 'refuah_vechaim',
    name: 'רפואה וחיים',
    url: 'https://refuah-vechaim.org.il/',
    description: 'תמיכה רפואית למשפחות וילדים חולים.',
    categories: ['medical'],
    tags: ['בריאות'],
  },
  {
    id: 'zichron_menachem',
    name: 'זכרון מנחם',
    url: 'https://www.zichron.org/',
    description: 'תמיכה לילדים חולי סרטן ולמשפחותיהם.',
    categories: ['medical', 'support'],
    tags: ['בריאות', 'ילדים'],
  },
  {
    id: 'ezer_mizion',
    name: 'עזר מציון',
    url: 'https://www.ezer-mizion.org.il/',
    description: 'מאגר מח עצם ושירותים רפואיים נלווים.',
    categories: ['medical'],
    tags: ['בריאות'],
  },

  // Clothes / Furniture / Welfare
  {
    id: 'pitchon_lev',
    name: 'פתחון לב',
    url: 'https://www.pitchonlev.org.il/',
    description: 'סיוע למשפחות: מזון, ביגוד, ריהוט ותעסוקה.',
    categories: ['food', 'clothes', 'furniture'],
    tags: ['רווחה'],
  },
  {
    id: 'wizo',
    name: 'ויצו',
    url: 'https://wizo.org.il/',
    description: 'רווחה, נשים, משפחה וביגודיות קהילתיות.',
    categories: ['clothes', 'housing', 'support'],
    tags: ['נשים', 'רווחה'],
  },

  // Books / Education
  {
    id: 'sifriyat_pijama',
    name: 'ספריית פיג׳מה',
    url: 'https://www.sifriyatpijama.org.il/',
    description: 'קידום קריאה לילדים בישראל.',
    categories: ['books', 'education'],
    tags: ['ספרים', 'חינוך'],
  },
  {
    id: 'rebooks',
    name: 'סיפור חוזר',
    url: 'https://www.rebooks.org.il/',
    description: 'תרומת ספרים ורכישה חברתית.',
    categories: ['books', 'education'],
    tags: ['ספרים'],
  },

  // Technology / Time (volunteering)
  {
    id: 'ruach_tova',
    name: 'רוח טובה',
    url: 'https://www.ruachtova.org.il/',
    description: 'מאגר הזדמנויות התנדבות ארצי.',
    categories: ['time'],
    tags: ['התנדבות', 'קהילה'],
  },
  {
    id: 'ivolunteer',
    name: 'המועצה הישראלית להתנדבות',
    url: 'https://ivolunteer.org.il/',
    description: 'פלטפורמה לקידום תחום ההתנדבות בישראל.',
    categories: ['time'],
    tags: ['התנדבות'],
  },
  {
    id: 'mdais_vol',
    name: 'מד"א – מתנדבים',
    url: 'https://www.mdais.org/volunteers',
    description: 'התנדבות בחירום ורפואה.',
    categories: ['time', 'medical'],
    tags: ['התנדבות', 'בריאות'],
  },
  {
    id: 'israaid_vol',
    name: 'IsraAID – התנדבות',
    url: 'https://www.israelaid.org.il/volunteer',
    description: 'סיוע הומניטרי בינלאומי.',
    categories: ['time', 'support'],
    tags: ['התנדבות', 'הומניטרי'],
  },
  {
    id: 'rak_chiyuch',
    name: 'רק חיוך',
    url: 'https://www.rakchiyuch.org.il/',
    description: 'עזרה לילדים חולי סרטן.',
    categories: ['time', 'medical', 'support'],
    tags: ['ילדים', 'בריאות'],
  },
  {
    id: 'sherut_leumi',
    name: 'השירות הלאומי – האגודה להתנדבות',
    url: 'https://sherut-leumi.co.il/',
    description: 'מסלולי שירות והתנדבות בקהילה.',
    categories: ['time'],
    tags: ['התנדבות', 'שירות לאומי'],
  },
  {
    id: 'begifted',
    name: 'BeGifted',
    url: 'https://www.begifted.org/',
    description: 'התנדבות בכישורים מקצועיים וטכנולוגיים.',
    categories: ['technology', 'time'],
    tags: ['טכנולוגיה', 'התנדבות'],
  },
];


