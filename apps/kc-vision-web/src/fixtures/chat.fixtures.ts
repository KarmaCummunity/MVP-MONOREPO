export interface VisionConversation {
  id: string
  participant_ids: string[]
  last_message_preview: string
  updated_at: string
  unread_count: number
}

export interface VisionChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  read: boolean
  reactions?: string[]
}

export const VISION_CONVERSATIONS: VisionConversation[] = [
  {
    id: 'conv-1',
    participant_ids: [
      'user-cd7712aa-5e44-4f2b-8c33-member-dana',
      'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    ],
    last_message_preview: 'מעולה, אז נתראה ב-19:00',
    updated_at: '2026-05-04T10:00:00.000Z',
    unread_count: 1,
  },
  {
    id: 'conv-2',
    participant_ids: [
      'user-b203d4ae-6f10-4d8c-9e01-operator-michal',
      'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    ],
    last_message_preview: 'מצרף פרטים מצומצמים בלבד',
    updated_at: '2026-05-03T15:20:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-3',
    participant_ids: [
      'user-f109eeda-2b8c-4a11-9f12-admin-nadav',
      'user-11001100-1100-1100-1100-superadmin',
    ],
    last_message_preview: 'בודקים את הדוח מהסופ״ש',
    updated_at: '2026-05-02T18:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-4',
    participant_ids: [
      'user-cd7712aa-5e44-4f2b-8c33-member-dana',
      'user-10',
    ],
    last_message_preview: 'תודה רבה על העזרה!',
    updated_at: '2026-05-04T08:30:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-5',
    participant_ids: [
      'user-11',
      'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    ],
    last_message_preview: 'אשמח לקבל את העגלה',
    updated_at: '2026-05-03T14:00:00.000Z',
    unread_count: 2,
  },
  {
    id: 'conv-6',
    participant_ids: [
      'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
      'user-61bb90ee-3c22-4d50-a401-vol-david',
    ],
    last_message_preview: 'אוקי, מגיע מחר בבוקר',
    updated_at: '2026-05-03T12:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-7',
    participant_ids: [
      'user-12',
      'user-e7c3f5a1-2d04-4b9e-8f33-manager-yad',
    ],
    last_message_preview: 'יש לי מזון עודף היום',
    updated_at: '2026-05-02T20:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-8',
    participant_ids: [
      'user-13',
      'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    ],
    last_message_preview: 'תודה על התיאום',
    updated_at: '2026-05-02T16:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-9',
    participant_ids: [
      'user-14',
      'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    ],
    last_message_preview: 'מתי אפשר לקבוע הסעה?',
    updated_at: '2026-05-01T10:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-10',
    participant_ids: [
      'user-15',
      'user-90219876-aabb-ccdd-student-tomer',
    ],
    last_message_preview: 'החוג מתחיל בשישי הבא',
    updated_at: '2026-04-30T15:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-11',
    participant_ids: [
      'user-16',
      'user-77223344-5566-7788-senior-rivka',
    ],
    last_message_preview: 'אשמח לתיאום טיפול',
    updated_at: '2026-04-29T11:00:00.000Z',
    unread_count: 1,
  },
  {
    id: 'conv-12',
    participant_ids: [
      'user-17',
      'user-aa901f22-6c41-4e50-b9e2-orgadmin-orot',
    ],
    last_message_preview: 'אשלח את העיצוב מחר',
    updated_at: '2026-04-28T14:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-13',
    participant_ids: [
      'user-18',
      'user-13',
    ],
    last_message_preview: 'תודה על הייעוץ המשפטי',
    updated_at: '2026-04-27T10:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-14',
    participant_ids: [
      'user-19',
      'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    ],
    last_message_preview: 'מתי השיעור הבא?',
    updated_at: '2026-04-26T09:00:00.000Z',
    unread_count: 0,
  },
  {
    id: 'conv-15',
    participant_ids: [
      'user-20',
      'user-90219876-aabb-ccdd-student-tomer',
    ],
    last_message_preview: 'הקורס התחיל מעולה!',
    updated_at: '2026-04-25T16:00:00.000Z',
    unread_count: 0,
  },
]

export const VISION_CHAT_MESSAGES: VisionChatMessage[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    body: 'היי דנה, קיבלת את הכתובת?',
    created_at: '2026-05-04T09:55:00.000Z',
    read: true,
    reactions: ['👍'],
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: 'user-cd7712aa-5e44-4f2b-8c33-member-dana',
    body: 'כן! אסע מחר בבוקר',
    created_at: '2026-05-04T09:58:00.000Z',
    read: true,
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    sender_id: 'user-4f88c1dd-9a2e-4f6c-bc11-vol-yael',
    body: 'מעולה, אז נתראה ב-19:00',
    created_at: '2026-05-04T10:00:00.000Z',
    read: false,
  },
]
