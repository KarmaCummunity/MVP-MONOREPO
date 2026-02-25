export const DB_COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  CHATS: 'chats',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  BOOKMARKS: 'bookmarks',
  DONATIONS: 'donations',
  ITEMS: 'items',
  TASKS: 'tasks',
  SETTINGS: 'settings',
  MEDIA: 'media',
  BLOCKED_USERS: 'blocked_users',
  MESSAGE_REACTIONS: 'message_reactions',
  TYPING_STATUS: 'typing_status',
  READ_RECEIPTS: 'read_receipts',
  VOICE_MESSAGES: 'voice_messages',
  CONVERSATION_METADATA: 'conversation_metadata',
  RIDES: 'rides',
  ORGANIZATIONS: 'organizations',
  ORG_APPLICATIONS: 'org_applications',
  ANALYTICS: 'analytics',
  LINKS: 'links',
} as const;

export type DBCollectionValue = typeof DB_COLLECTIONS[keyof typeof DB_COLLECTIONS];

