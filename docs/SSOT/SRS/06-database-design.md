> **SRS shard:** `SRS/06-database-design.md` — part of [SRS index](README.md). References § refer to the full document.

## 6. Database Design

### 6.1 Primary Schema (`schema.sql`)

**Extensions:** `uuid-ossp` (UUID generation), `pg_trgm` (trigram text search)

#### 6.1.1 User & Auth

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|------------|-------------|
| `user_profiles` | `id` UUID | `firebase_uid`, `google_id`, `email`, `name`, `phone`, `avatar_url`, `bio`, `karma_points` INT, `city`, `country`, `interests` TEXT[], `roles` TEXT[] default `{user}` (SHALL support `volunteer_manager`, `operator`, and org-scoped semantics per §2.2.5 and §2.14), `password_hash`, `email_verified` BOOL, `settings` JSONB (SHALL support profile UI preferences per §2.2.6), `parent_manager_id` UUID, `salary` NUMERIC, `seniority_start_date` DATE, `posts_count`, `followers_count`, `following_count`, `total_donations_amount`, `total_volunteer_hours` | UNIQUE(`email`), UNIQUE(`firebase_uid`), UNIQUE(`google_id`), FK `parent_manager_id` → self; **optional `organization_id` → `organizations`** — required by §2.2.5 for org-affiliated volunteers if not already present — there is not enough information in the code to determine current column |
| `user_follows` | `id` UUID | `follower_id`, `following_id`, `created_at` | UNIQUE(`follower_id`, `following_id`) |
| `user_activities` | `id` UUID | `user_id`, `activity_type`, `description`, `metadata` JSONB, `created_at` | — |
| `user_notifications` | `id` UUID | `user_id`, `type`, `title`, `message`, `data` JSONB, `is_read` BOOL, `created_at` | — |

#### 6.1.2 Organizations

| Table | Primary Key | Key Columns |
|-------|------------|------------|
| `organizations` | `id` UUID | `name`, `description`, `logo_url`, `website`, `contact_email`, `phone`, `address`, `city`, `country`, `type`, `status` default `pending`, `created_by` UUID |
| `organization_applications` | `id` UUID | `user_id`, `organization_id`, `status` default `pending`, `message`, `reviewed_by` |

#### 6.1.3 Donations

| Table | Primary Key | Key Columns |
|-------|------------|------------|
| `donation_categories` | `id` UUID | `name`, `slug` (UNIQUE), `description`, `icon`, `color` |
| ``donations'' | `id` UUID | `donor_id`, `recipient_id`, `organization_id`, `category_id`, `type`, `title`, `description`, `amount` NUMERIC, `quantity` INT, `status` default `available`, `city`, `country`, `location`, `images` TEXT[], `tags` TEXT[], `metadata` JSONB |

#### 6.1.4 Rides

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|------------|-------------|
| `rides` | `id` UUID | `driver_id`, `origin`, `destination`, `origin_city`, `destination_city`, `departure_time` TIMESTAMP, `available_seats` INT, `price` NUMERIC, `description`, `status` default `active`, `vehicle_info`, `preferences`, `route_details` JSONB | — |
| `ride_bookings` | `id` UUID | `ride_id`, `passenger_id`, `seats_booked` INT default 1, `status` default `pending`, `message` | UNIQUE(`ride_id`, `passenger_id`) |

#### 6.1.5 Events

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|------------|-------------|
| `community_events` | `id` UUID | `organizer_id`, `organization_id`, `title`, `description`, `event_type`, `start_date`, `end_date`, `location`, `city`, `max_attendees`, `current_attendees` default 0, `status` default `upcoming`, `tags` TEXT[], `images` TEXT[] | — |
| `event_attendees` | `id` UUID | `event_id`, `user_id`, `status` default `registered` | UNIQUE(`event_id`, `user_id`) |

#### 6.1.6 Chat

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|------------|-------------|
| `chat_conversations` | `id` UUID | `participants` UUID[], `type` default `direct`, `name`, `last_message_at`, `metadata` JSONB | GIN index on `participants` |
| `chat_messages` | `id` UUID | `conversation_id` UUID NOT NULL, `sender_id`, `content`, `type` default `text`, `metadata` JSONB, `is_edited` BOOL, `edited_at` | — |
| `message_read_receipts` | `id` UUID | `message_id`, `user_id`, `read_at` | UNIQUE(`message_id`, `user_id`) |

#### 6.1.7 Statistics Constraints |
|-------|------------|-------------|-------------|
| `community_stats` | `id` UUID | `stat_type`, `value` NUMERIC default 0, `city`, `date_period`, `metadata` JSONB | UNIQUE(`stat_type`, `city`, `date_period`) |

#### 6.1.8 Posts & Social

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `posts` | `id` UUID | `author_id`, `post_type`, `title`, `description`, `image`, `likes_count` default 0, `comments_count` default 0, `is_hidden` BOOL, `hidden_at`, `hidden_by`, `task_id`, `ride_id`, `item_id` TEXT, `community_challenge_id` UUID, **`anonymity_level` SMALLINT DEFAULT 4** | FK `author_id` → `user_profiles` CASCADE, FK `task_id` → `tasks` SET NULL, FK `ride_id` → `rides` CASCADE, FK `item_id` → `items` CASCADE, FK `community_challenge_id` → `community_group_challenges` CASCADE, **CHECK (`anonymity_level` BETWEEN 1 AND 4)** |
| `post_likes` | `id` UUID | `post_id`, `user_id`, `created_at` | UNIQUE(`post_id`, `user_id`) |
| `post_comments` | `id` UUID | `post_id`, `user_id`, `text`, `likes_count` default 0 | CHECK `length(text) BETWEEN 1 AND 2000` |
| `comment_likes` | `id` UUID | `comment_id`, `user_id`, `created_at` | UNIQUE(`comment_id`, `user_id`) |

**Note:** The `anonymity_level` column does **not** currently exist on the `posts` table in the codebase (`posts-schema.service.ts` DDL and `schema.sql`). It is a **required schema addition** — see §10.1.

#### 6.1.9 Items

| Table | Primary Key | Key Columns |
|-------|------------|-------------|
| `items` | `id` TEXT | `owner_id` UUID NOT NULL, `title`, `description`, `category`, `condition`, `city`, `address`, `coordinates` JSONB, `price` NUMERIC, `image_url`, `rating` NUMERIC, `tags` TEXT[], `quantity` INT default 1, `delivery_method`, `status` default `available`, `is_deleted` BOOL default false |
| `item_requests` | `id` UUID | `item_id` TEXT, `requester_id`, `owner_id`, `status` default `pending`, `message`, `proposed_time`, `delivery_method`, `meeting_location` JSONB, `owner_response` |

#### 6.1.10 Tasks

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `tasks` | `id` UUID | `title`, `description`, `status` default `todo`, `priority` default `medium`, `parent_task_id` UUID, `assignees` TEXT[], `tags` TEXT[], `due_date`, `estimated_hours` NUMERIC, `created_by` | FK `parent_task_id` → `tasks` CASCADE |
| `task_time_logs` | `id` UUID | `task_id`, `user_id`, `actual_hours` NUMERIC, `notes`, `logged_at` | FK `task_id` → `tasks` CASCADE, FK `user_id` → `user_profiles` CASCADE, UNIQUE(`task_id`, `user_id`), CHECK `actual_hours > 0` |

#### 6.1.11 Admin

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `admin_tables` | `id` UUID | `name`, `description`, `created_by`, `created_at`, `updated_at` | — |
| `admin_table_columns` | `id` UUID | `table_id` UUID, `name`, `data_type`, `is_required` BOOL, `default_value`, `order_index` INT | UNIQUE(`table_id`, `name`), CHECK `data_type IN ('text', 'number', 'date')` |
| `admin_table_rows` | `id` UUID | `table_id` UUID, `data` JSONB, `created_by`, `created_at`, `updated_at` | GIN index on `data` |

#### 6.1.12 Community Members

| Table | Primary Key | Key Columns |
|-------|------------|-------------|
| `community_members` | `id` UUID | `name`, `email`, `phone`, `role`, `status`, `notes`, `joined_at`, `created_at`, `updated_at` |

#### 6.1.13 Operator Matching (NEW — required schema)

These tables do **not** exist in the current codebase. They are **required additions** for the operator matching feature (§2.14).

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `matching_cases` | `id` UUID DEFAULT `uuid_generate_v4()` | `post_id` UUID NOT NULL, `requester_id` UUID NOT NULL, `assigned_operator_id` UUID, `status` VARCHAR(20) DEFAULT `'unassigned'`, `priority` VARCHAR(10) DEFAULT `'medium'`, `category` VARCHAR(100), `notes` TEXT, `created_at` TIMESTAMPTZ DEFAULT NOW(), `updated_at` TIMESTAMPTZ DEFAULT NOW(), `resolved_at` TIMESTAMPTZ | FK `post_id` → `posts(id)` ON DELETE CASCADE, FK `requester_id` → `user_profiles(id)`, FK `assigned_operator_id` → `user_profiles(id)`, CHECK `status IN ('unassigned','assigned','in_progress','proposed','accepted','declined','completed','cancelled')`, CHECK `priority IN ('low','medium','high','urgent')`, UNIQUE(`post_id`) — one case per post |
| `matching_candidates` | `id` UUID DEFAULT `uuid_generate_v4()` | `case_id` UUID NOT NULL, `candidate_user_id` UUID NOT NULL, `candidate_type` VARCHAR(20) NOT NULL, `match_reason` TEXT, `status` VARCHAR(20) DEFAULT `'proposed'`, `proposed_at` TIMESTAMPTZ DEFAULT NOW(), `responded_at` TIMESTAMPTZ | FK `case_id` → `matching_cases(id)` ON DELETE CASCADE, FK `candidate_user_id` → `user_profiles(id)`, CHECK `candidate_type IN ('volunteer','donor')`, CHECK `status IN ('proposed','accepted','declined','withdrawn')`, UNIQUE(`case_id`, `candidate_user_id`) |
| `matching_case_audit` | `id` UUID DEFAULT `uuid_generate_v4()` | `case_id` UUID, `actor_id` UUID NOT NULL, `action` VARCHAR(50) NOT NULL, `details` JSONB DEFAULT `'{}'::jsonb`, `created_at` TIMESTAMPTZ DEFAULT NOW() | FK `case_id` → `matching_cases(id)` ON DELETE SET NULL, FK `actor_id` → `user_profiles(id)`, CHECK `action IN ('view_queue','claim_item','create_case','propose_candidate','update_status','add_note','view_requester_pii','reassign','cancel')` |

**Recommended indexes:**
- `matching_cases(status)` — for queue filtering
- `matching_cases(assigned_operator_id)` — for operator's case list
- `matching_cases(post_id)` — for lookup by post (covered by UNIQUE)
- `matching_candidates(case_id)` — for candidates per case
- `matching_case_audit(case_id, created_at)` — for audit trail queries
- GIN index on `matching_case_audit.details` — for JSONB queries

### 6.2 Personal Challenges Schema (`challenges-schema.sql`)

| Table | Primary Key | Key Columns |
|-------|------------|-------------|
| `challenges` | `id` UUID | `user_id` VARCHAR(255), `name`, `start_date` BIGINT, `current_value` BIGINT, `time_unit` (CHECK: seconds/minutes/hours/days/weeks/months/years), `custom_reset_amount` (CHECK > 0), `reset_count` INT, `best_streak` BIGINT, `last_calculated` BIGINT, `last_reset_date` BIGINT |
| `deleted_challenges` | `id` UUID | Same as `challenges` + `deleted_at` BIGINT, `final_value` BIGINT |
| `challenge_reset_logs` | `id` UUID | `challenge_id` UUID, `user_id`, `timestamp` BIGINT, `mood` INT (1–5), `amount_before`/`amount_after` BIGINT, `trigger`, `notes` |
| `challenge_record_breaks` | `id` UUID | `challenge_id` UUID, `user_id`, `old_record`/`new_record` BIGINT, `improvement` BIGINT, `context`, `reason` |
| `challenge_global_stats` | `user_id` VARCHAR (PK) | `total_challenges` INT, `total_resets` INT, `best_streak` BIGINT, `total_clean_time` BIGINT, dates as BIGINTs |

**Note:** `user_id` in challenges is VARCHAR, not UUID — separate from `user_profiles.id`.

### 6.3 Community Group Challenges Schema (`community-group-challenges-schema.sql`)

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `community_group_challenges` | `id` UUID | `creator_id` UUID, `title`, `description`, `image_url`, `type` (BOOLEAN/NUMERIC/DURATION), `frequency` (DAILY/WEEKLY/FLEXIBLE), `goal_value` NUMERIC, `goal_direction` (maximize/minimize), `deadline`, `difficulty` (easy/medium/hard/expert), `category`, `is_active` BOOL, `participants_count` INT default 0 | FK `creator_id` → `user_profiles` CASCADE |
| `community_challenge_participants` | `id` UUID | `challenge_id`, `user_id`, `joined_at`, `current_streak` INT, `longest_streak` INT, `total_entries` INT, `last_entry_date` | UNIQUE(`challenge_id`, `user_id`), FK both → parent tables |
| `community_challenge_entries` | `id` UUID | `challenge_id`, `user_id`, `entry_date` DATE, `value` NUMERIC NOT NULL, `notes` | UNIQUE(`challenge_id`, `user_id`, `entry_date`), FK both → parent tables |

### 6.4 Database Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| `update_updated_at_column` | `user_profiles`, `organizations`, `donations`, `rides`, `chat_conversations`, `tasks`, `posts`, `post_comments`, `items`, `item_requests`, **`matching_cases`** (required) | Sets `updated_at = NOW()` on UPDATE |
| `update_post_likes_count` | `post_likes` | Maintains `posts.likes_count` on INSERT/DELETE |
| `update_post_comments_count` | `post_comments` | Maintains `posts.comments_count` on INSERT/DELETE |
| `update_comment_likes_count` | `comment_likes` | Maintains `post_comments.likes_count` on INSERT/DELETE |

### 6.5 Indexes (Notable)

- **Text search:** GIN trigram indexes on `items.title`, `items.description` for `%LIKE%` queries
- **Array fields:** GIN indexes on `user_profiles.roles`, `chat_conversations.participants`, `tasks.assignees`, `tasks.tags`
- **JSONB:** GIN indexes on `admin_table_rows.data`, **`matching_case_audit.details`** (required)
- **Partial indexes:** Active users (`is_active = true`), non-null `firebase_uid`/`google_id`, recent challenge entries (last 90 days)
- **Operator matching (required):** indexes on `matching_cases(status)`, `matching_cases(assigned_operator_id)`, `matching_candidates(case_id)`, `matching_case_audit(case_id, created_at)`

### 6.6 Entity Relationships

```
user_profiles ──1:N──→ donations (as donor)
user_profiles ──1:N──→ rides (as driver)
user_profiles ──1:N──→ posts (as author)
user_profiles ──1:N──→ tasks (as creator)
user_profiles ──1:N──→ items (as owner)
user_profiles ──1:1──→ user_profiles (parent_manager_id, self-referencing; models **volunteer managers** and other managers with volunteers in subtree)
user_profiles ──N:N──→ user_profiles (via user_follows)
user_profiles ──N:1──→ organizations (optional FK for **organization-affiliated volunteers** — see §2.2.5 / §10.1)

rides ──1:N──→ ride_bookings
rides ──1:N──→ posts (ride_id FK)

posts ──1:N──→ post_likes
posts ──1:N──→ post_comments
posts ──1:1──→ matching_cases (post_id FK — one case per post, see §2.14)
post_comments ──1:N──→ comment_likes
posts ──N:1──→ tasks (task_id FK)
posts ──N:1──→ items (item_id FK)
posts ──N:1──→ community_group_challenges (community_challenge_id FK)

matching_cases ──1:N──→ matching_candidates (case_id FK)
matching_cases ──1:N──→ matching_case_audit (case_id FK)
user_profiles ──1:N──→ matching_cases (as assigned_operator_id)
user_profiles ──1:N──→ matching_cases (as requester_id)
user_profiles ──1:N──→ matching_candidates (as candidate_user_id)

tasks ──1:N──→ tasks (parent_task_id, self-referencing)
tasks ──1:N──→ task_time_logs
user_profiles ──1:N──→ task_time_logs

community_group_challenges ──1:N──→ community_challenge_participants
community_group_challenges ──1:N──→ community_challenge_entries
user_profiles ──1:N──→ community_challenge_participants
user_profiles ──1:N──→ community_challenge_entries

chat_conversations ──1:N──→ chat_messages
chat_messages ──1:N──→ message_read_receipts

community_events ──1:N──→ event_attendees

items ──1:N──→ item_requests

admin_tables ──1:N──→ admin_table_columns
admin_tables ──1:N──→ admin_table_rows

donation_categories ──1:N──→ donations (implied, no FK enforced)
organizations ──1:N──→ organization_applications
```

---

