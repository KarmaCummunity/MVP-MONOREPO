רשימת הקולקציות הנתמכות (טבלאות):

users, posts, followers, following, chats, messages, notifications, bookmarks,
donations, tasks, settings, media, blocked_users, message_reactions, typing_status,
read_receipts, voice_messages, conversation_metadata, rides,
organizations, org_applications

פורמט הנתונים בכל טבלה: עמודת JSONB בשם `data`, עם מפתח `(user_id, item_id)`.

Auth:
- נקודות קצה: `POST /auth/register`, `POST /auth/login`, `GET /auth/check-email?email=...`
- חיפוש משתמש לפי מייל יעיל באמצעות אינדקס: `users_email_lower_idx`

