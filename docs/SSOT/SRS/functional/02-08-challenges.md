> **SRS shard:** `SRS/functional/02-08-challenges.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.8 Challenges Module (`modules/challenges`)

#### 2.8.1 Personal Challenges (Timers)

- **Description:** Individual habit/timer tracking with streaks
- **Controller prefix:** `/api/challenges`
- **Endpoints:**
  - `POST /api/challenges` — create challenge
  - `GET /api/challenges` — list challenges
  - `GET /api/challenges/:id` — get by ID
  - `PUT /api/challenges/:id` — update
  - `DELETE /api/challenges/:id` — soft delete (moves to `deleted_challenges`)
  - `POST /api/challenges/restore/:id` — restore deleted challenge
  - `GET /api/challenges/history/deleted` — deleted challenge history
  - `POST /api/challenges/reset-logs` — log a challenge reset
  - `GET /api/challenges/reset-logs/all` — list reset logs
  - `POST /api/challenges/record-breaks` — record break log
  - `GET /api/challenges/record-breaks/all` — list record breaks
- **Business logic:**
  - Epoch-based timestamps (BIGINTs) for start, current value, last calculated, streaks
  - Time units: seconds, minutes, hours, days, weeks, months, years (CHECK constraint)
  - Reset tracking with mood (1–5 scale) and before/after amounts
  - Record breaks log old/new records with improvement context
  - Global stats per user (`challenge_global_stats`)

#### 2.8.2 Community Group Challenges

- **Description:** Shared community challenges with participation tracking
- **Controller prefix:** `/api/community-challenges`
- **Endpoints:**
  - `POST /api/community-challenges` — create challenge
  - `GET /api/community-challenges` — list (with filters)
  - `GET /api/community-challenges/daily-tracker` — daily tracking view
  - `GET /api/community-challenges/:id` — get by ID
  - `POST /api/community-challenges/:id/join` — join challenge
  - `POST /api/community-challenges/:id/entries` — submit entry
  - `GET /api/community-challenges/:id/entries` — list entries
  - `GET /api/community-challenges/user/:userId/stats` — user challenge stats
  - `PUT /api/community-challenges/:id` — update
  - `DELETE /api/community-challenges/:id` — delete
- **Types (enum):** `BOOLEAN`, `NUMERIC`, `DURATION`
- **Frequency (enum):** `DAILY`, `WEEKLY`, `FLEXIBLE`
- **Difficulty (enum):** `easy`, `medium`, `hard`, `expert`
- **Goal direction (enum):** `maximize`, `minimize`
- **Business logic:**
  - Unique constraint on `(challenge_id, user_id)` for participants
  - Unique constraint on `(challenge_id, user_id, entry_date)` for entries
  - Participant streak tracking (current, longest, total entries)
  - Challenge links to posts via `posts.community_challenge_id` FK