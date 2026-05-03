> **SRS shard:** `SRS/functional/02-09-notifications.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.9 Notifications Module (`modules/notifications`)

#### 2.9.1 Notification Management

- **Description:** User notifications with read/unread tracking
- **Controller prefix:** `/api/notifications`
- **Guards:** `ThrottleGuard` + `JwtAuthGuard` on entire controller
- **Endpoints:**
  - `GET /api/notifications/:userId/unread-count` — unread count only (aggregate; for badges without listing rows)
  - `GET /api/notifications/:userId` — get user notifications
  - `POST /api/notifications/:userId/read-all` — mark all as read
  - `PUT /api/notifications/:userId/:notificationId/read` — mark one as read
  - `DELETE /api/notifications/:userId/:notificationId` — delete notification
  - `DELETE /api/notifications/:userId` — clear all
- **Database:** Two tables exist:
  - `user_notifications` (in `schema.sql`) — general notifications
  - `notifications` (in `migrations/create_notifications_table.sql`) — with JSONB `data` field, `item_id`
- **Mobile push:** Expo Notifications with polling (~15s interval when native listener is active), local notification scheduling, Android channel configuration