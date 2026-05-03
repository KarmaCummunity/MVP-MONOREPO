List of supported collections (tables):

users, posts, followers, following, chats, messages, notifications, bookmarks,
donations, tasks, settings, media, blocked_users, message_reactions, typing_status,
read_receipts, voice_messages, conversation_metadata, rides,
organizations, org_applications

The data format in each table: JSONB column named `data`, with key `(user_id, item_id)`.

Auth:
- Endpoints: `POST /auth/register`, `POST /auth/login`, `GET /auth/check-email?email=...`
- User search by email is efficient using index: `users_email_lower_idx`