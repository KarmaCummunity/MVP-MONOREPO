/** SRS §2.3 — category grid (subset named like mobile + Shiduchim Tov). */
export interface DonationCategoryVision {
  id: string
  slug: string
  icon: string
  label_he: string
  label_en: string
}

export const VISION_DONATION_CATEGORIES: DonationCategoryVision[] = [
  { id: 'c-money', slug: 'money', icon: 'Banknote', label_he: 'כסף', label_en: 'Money' },
  { id: 'c-food', slug: 'food', icon: 'Apple', label_he: 'מזון', label_en: 'Food' },
  { id: 'c-clothes', slug: 'clothes', icon: 'Shirt', label_he: 'ביגוד', label_en: 'Clothes' },
  { id: 'c-books', slug: 'books', icon: 'BookOpen', label_he: 'ספרים', label_en: 'Books' },
  { id: 'c-furniture', slug: 'furniture', icon: 'Sofa', label_he: 'ריהוט', label_en: 'Furniture' },
  { id: 'c-medical', slug: 'medical', icon: 'HeartPulse', label_he: 'רפואי', label_en: 'Medical' },
  { id: 'c-tech', slug: 'technology', icon: 'Cpu', label_he: 'טכנולוגיה', label_en: 'Technology' },
  { id: 'c-games', slug: 'games', icon: 'Gamepad2', label_he: 'משחקים', label_en: 'Games' },
  { id: 'c-plants', slug: 'plants', icon: 'Sprout', label_he: 'צמחים', label_en: 'Plants' },
  { id: 'c-waste', slug: 'waste', icon: 'Recycle', label_he: 'מיחזור', label_en: 'Recycling' },
  { id: 'c-art', slug: 'art', icon: 'Palette', label_he: 'אמנות', label_en: 'Art' },
  { id: 'c-sports', slug: 'sports', icon: 'Dumbbell', label_he: 'ספורט', label_en: 'Sports' },
  { id: 'c-music', slug: 'music', icon: 'Music', label_he: 'מוזיקה', label_en: 'Music' },
  { id: 'c-recipes', slug: 'recipes', icon: 'ChefHat', label_he: 'מתכונים', label_en: 'Recipes' },
  { id: 'c-riddles', slug: 'riddles', icon: 'HelpCircle', label_he: 'חידונים', label_en: 'Riddles' },
  { id: 'c-time', slug: 'time', icon: 'Clock', label_he: 'זמן', label_en: 'Time' },
  { id: 'c-knowledge', slug: 'knowledge', icon: 'GraduationCap', label_he: 'ידע', label_en: 'Knowledge' },
  { id: 'c-animals', slug: 'animals', icon: 'PawPrint', label_he: 'בעלי חיים', label_en: 'Animals' },
  { id: 'c-housing', slug: 'housing', icon: 'Home', label_he: 'דיור', label_en: 'Housing' },
  { id: 'c-support', slug: 'support', icon: 'Handshake', label_he: 'תמיכה', label_en: 'Support' },
  { id: 'c-education', slug: 'education', icon: 'School', label_he: 'חינוך', label_en: 'Education' },
  { id: 'c-environment', slug: 'environment', icon: 'TreePine', label_he: 'סביבה', label_en: 'Environment' },
  { id: 'c-mental', slug: 'mental-health', icon: 'Brain', label_he: 'בריאות נפש', label_en: 'Mental health' },
  { id: 'c-lang', slug: 'languages', icon: 'Languages', label_he: 'שפות', label_en: 'Languages' },
  { id: 'c-dreams', slug: 'dreams', icon: 'Moon', label_he: 'חלומות', label_en: 'Dreams' },
  { id: 'c-fertility', slug: 'fertility', icon: 'Baby', label_he: 'פוריות', label_en: 'Fertility' },
  { id: 'c-jobs', slug: 'jobs', icon: 'Briefcase', label_he: 'קריירה', label_en: 'Jobs' },
  {
    id: 'c-matchmaking',
    slug: 'matchmaking',
    icon: 'Heart',
    label_he: 'שידוכים (רומנטי)',
    label_en: 'Matchmaking',
  },
  {
    id: 'c-shiduchim-tov',
    slug: 'shiduchim-tov',
    icon: 'Link2',
    label_he: 'שידוכים טוב',
    label_en: 'Good Matching',
  },
  { id: 'c-golden', slug: 'golden-age', icon: 'Sun', label_he: 'גיל הזהב', label_en: 'Golden age' },
]

export interface VisionDonationOffer {
  id: string
  category_slug: string
  donor_id: string
  title: string
  amount?: number
  currency?: string
  created_at: string
}

export const VISION_DONATIONS: VisionDonationOffer[] = [
  {
    id: 'don-001',
    category_slug: 'food',
    donor_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    title: 'תרומת מזון יבש — ארגון יד ביד',
    amount: 1200,
    currency: 'ILS',
    created_at: '2026-05-01T10:00:00.000Z',
  },
  {
    id: 'don-002',
    category_slug: 'money',
    donor_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    title: 'תרומה חודשית — הוראת קבע',
    amount: 200,
    currency: 'ILS',
    created_at: '2026-05-03T08:00:00.000Z',
  },
  {
    id: 'don-003',
    category_slug: 'money',
    donor_id: 'user-12',
    title: 'תרומה חד-פעמית — סוף שנת מס',
    amount: 5000,
    currency: 'ILS',
    created_at: '2026-04-30T11:00:00.000Z',
  },
  {
    id: 'don-004',
    category_slug: 'clothes',
    donor_id: 'user-11',
    title: 'בגדי תינוקות 0-12 חודשים — חבילה גדולה',
    created_at: '2026-04-28T14:00:00.000Z',
  },
  {
    id: 'don-005',
    category_slug: 'books',
    donor_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    title: 'ארגז ספרי ילדים — מצב מצוין',
    created_at: '2026-04-27T18:00:00.000Z',
  },
  {
    id: 'don-006',
    category_slug: 'technology',
    donor_id: 'user-10',
    title: 'מחשבון מדעי TI-84',
    created_at: '2026-04-25T10:00:00.000Z',
  },
  {
    id: 'don-007',
    category_slug: 'medical',
    donor_id: 'user-16',
    title: 'טיפולי פיזיותרפיה למבוגרים — 10 שעות',
    created_at: '2026-04-26T09:00:00.000Z',
  },
  {
    id: 'don-008',
    category_slug: 'education',
    donor_id: 'user-10',
    title: 'שיעורי עזר במתמטיקה — תיכון',
    created_at: '2026-04-26T11:00:00.000Z',
  },
  {
    id: 'don-009',
    category_slug: 'time',
    donor_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    title: 'יום התנדבות אצל קשישים — נתניה',
    created_at: '2026-05-04T07:00:00.000Z',
  },
  {
    id: 'don-010',
    category_slug: 'music',
    donor_id: 'user-77223344-5566-7788-senior-rivka',
    title: 'גיטרה אקוסטית מצב טוב + מדריך מודפס',
    created_at: '2026-04-24T15:00:00.000Z',
  },
  {
    id: 'don-011',
    category_slug: 'recipes',
    donor_id: 'user-77223344-5566-7788-senior-rivka',
    title: '100 מתכוני שבת קצרים — חוברת PDF',
    created_at: '2026-04-22T10:00:00.000Z',
  },
  {
    id: 'don-012',
    category_slug: 'plants',
    donor_id: 'user-19',
    title: 'שתילי בזיליקום, נענע ופטרוזיליה — חינם',
    created_at: '2026-04-21T08:00:00.000Z',
  },
  {
    id: 'don-013',
    category_slug: 'animals',
    donor_id: 'user-13',
    title: 'מזון לכלבים — שק 15 ק"ג שלא נפתח',
    created_at: '2026-04-20T17:00:00.000Z',
  },
  {
    id: 'don-014',
    category_slug: 'art',
    donor_id: 'user-17',
    title: 'עיצוב פלאיירים לעמותה — חינם',
    created_at: '2026-05-02T13:00:00.000Z',
  },
  {
    id: 'don-015',
    category_slug: 'sports',
    donor_id: 'user-19',
    title: '5 מזרני יוגה לסטודיו קהילתי',
    created_at: '2026-04-19T11:00:00.000Z',
  },
  {
    id: 'don-016',
    category_slug: 'languages',
    donor_id: 'user-77223344-5566-7788-senior-rivka',
    title: 'שיעורי ספרדית מתחילים — קבוצה של 8',
    created_at: '2026-04-18T09:00:00.000Z',
  },
  {
    id: 'don-017',
    category_slug: 'mental-health',
    donor_id: 'user-13',
    title: 'שיחות תמיכה רגשיות — אחת בשבוע',
    created_at: '2026-04-17T16:00:00.000Z',
  },
  {
    id: 'don-018',
    category_slug: 'jobs',
    donor_id: 'user-18',
    title: 'הכנה לראיונות עבודה לבוגרי מערכת חינוך',
    created_at: '2026-04-15T10:00:00.000Z',
  },
  {
    id: 'don-019',
    category_slug: 'golden-age',
    donor_id: 'user-77223344-5566-7788-senior-rivka',
    title: 'חוג ספרדית למבוגרים — חינם',
    created_at: '2026-04-14T08:00:00.000Z',
  },
  {
    id: 'don-020',
    category_slug: 'environment',
    donor_id: 'user-19',
    title: 'יום ניקיון חוף — מתואם עם העירייה',
    created_at: '2026-04-13T07:00:00.000Z',
  },
]
