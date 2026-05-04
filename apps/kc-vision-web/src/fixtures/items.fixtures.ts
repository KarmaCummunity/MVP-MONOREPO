export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'

export type ItemRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface VisionDedicatedItem {
  id: string
  owner_id: string
  title: string
  description: string
  category: string
  condition: ItemCondition
  city: string
  status: 'available' | 'reserved' | 'delivered'
}

export interface VisionItemDeliveryRequest {
  id: string
  item_id: string
  requester_id: string
  message: string
  status: ItemRequestStatus
}

export const VISION_ITEMS: VisionDedicatedItem[] = [
  {
    id: 'item-001',
    owner_id: 'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    title: 'מקרר קטן למשרד',
    description: 'עובד — צריך הובלה עצמית.',
    category: 'appliances',
    condition: 'good',
    city: 'נתניה',
    status: 'available',
  },
  {
    id: 'item-002',
    owner_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    title: 'ספרי ילדים (ארגז)',
    description: 'מצב מעולה, לא נדרש תשלום.',
    category: 'books',
    condition: 'like_new',
    city: 'רמת גן',
    status: 'reserved',
  },
  {
    id: 'item-003',
    owner_id: 'user-11',
    title: 'כיסא אוכל לתינוק',
    description: 'כיסא במצב מצוין, נקי ומתקפל. מתאים מגיל 6 חודשים.',
    category: 'furniture',
    condition: 'like_new',
    city: 'פתח תקווה',
    status: 'available',
  },
  {
    id: 'item-004',
    owner_id: 'user-12',
    title: 'מיקרוגל למטבח',
    description: 'עובד מצוין, מודל חדש יחסית. צבע שחור.',
    category: 'appliances',
    condition: 'good',
    city: 'ראשון לציון',
    status: 'available',
  },
  {
    id: 'item-005',
    owner_id: 'user-15',
    title: 'משטח לציור',
    description: 'משטח עץ גדול לציור - מתאים לילדים ומבוגרים.',
    category: 'art',
    condition: 'good',
    city: 'כפר סבא',
    status: 'available',
  },
  {
    id: 'item-006',
    owner_id: 'user-77223344-5566-7788-senior-rivka',
    title: 'מכונת תפירה ישנה',
    description: 'מכונת תפירה ידנית - עובדת מצוין. למי שיודע להשתמש.',
    category: 'appliances',
    condition: 'fair',
    city: 'ירושלים',
    status: 'available',
  },
  {
    id: 'item-007',
    owner_id: 'user-20',
    title: 'מקלדת ועכבר גיימינג',
    description: 'RGB מקלדת ועכבר במצב טוב - למי שאוהב גיימינג.',
    category: 'technology',
    condition: 'good',
    city: 'תל אביב–יפו',
    status: 'reserved',
  },
  {
    id: 'item-008',
    owner_id: 'user-13',
    title: 'שולחן כתיבה',
    description: 'שולחן עץ בגודל בינוני - מצב טוב מאוד. צריך איסוף עצמי.',
    category: 'furniture',
    condition: 'good',
    city: 'חולון',
    status: 'available',
  },
  {
    id: 'item-009',
    owner_id: 'user-10',
    title: 'מחשבון מדעי',
    description: 'מחשבון TI-84 Plus - מצוין לתלמידי תיכון ואוניברסיטה.',
    category: 'technology',
    condition: 'like_new',
    city: 'באר שבע',
    status: 'delivered',
  },
  {
    id: 'item-010',
    owner_id: 'user-17',
    title: 'טאבלט גרפי לעיצוב',
    description: 'Wacom טאבלט למתחילים - מצב מצוין עם עט.',
    category: 'technology',
    condition: 'like_new',
    city: 'תל אביב–יפו',
    status: 'available',
  },
  {
    id: 'item-011',
    owner_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    title: 'שטיח לסלון',
    description: 'שטיח בגודל 2x3 מטר - צבע בז׳, נקי ומצב טוב.',
    category: 'furniture',
    condition: 'good',
    city: 'רמת גן',
    status: 'available',
  },
  {
    id: 'item-012',
    owner_id: 'user-19',
    title: 'מזרני יוגה',
    description: '5 מזרני יוגה במצב טוב - למי שמתחיל לעסוק ביוגה.',
    category: 'sports',
    condition: 'good',
    city: 'הרצליה',
    status: 'available',
  },
  {
    id: 'item-013',
    owner_id: 'user-16',
    title: 'ספרי רפואה',
    description: 'אוסף של 10 ספרי רפואה ופיזיותרפיה - מצב מצוין.',
    category: 'books',
    condition: 'like_new',
    city: 'רעננה',
    status: 'available',
  },
  {
    id: 'item-014',
    owner_id: 'user-11',
    title: 'עגלת תינוק',
    description: 'עגלה במצב מצוין - נקייה לחלוטין. איסוף בלבד.',
    category: 'furniture',
    condition: 'like_new',
    city: 'פתח תקווה',
    status: 'reserved',
  },
  {
    id: 'item-015',
    owner_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    title: 'סיר לחץ',
    description: 'סיר לחץ 6 ליטר - עובד מצוין, בטיחותי.',
    category: 'appliances',
    condition: 'good',
    city: 'נתניה',
    status: 'available',
  },
]

export const VISION_ITEM_REQUESTS: VisionItemDeliveryRequest[] = [
  {
    id: 'ir-001',
    item_id: 'item-002',
    requester_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    message: 'אפשר לאסוף בערב?',
    status: 'pending',
  },
]
