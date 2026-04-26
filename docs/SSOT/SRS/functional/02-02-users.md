> **SRS shard:** `SRS/functional/02-02-users.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.2 Users Module (`modules/users`)

#### 2.2.1 User Profile Management

- **Description:** CRUD operations for user profiles
- **Endpoints:**
  - `GET /api/users` — list all users
  - `GET /api/users/search` — search users
  - `GET /api/users/:id` — get user by ID
  - `PUT /api/users/:id` — update profile (requires `JwtAuthGuard`)
- **Inputs:** Profile fields (name, phone, bio, avatar_url, city, country, interests, settings)
- **Outputs:** `ApiResponse<UserProfile>`
- **Business logic:**
  - Search supports text matching across name and email
  - Profile updates restricted to authenticated users or admin

#### 2.2.2 Follow System

- **Description:** Social following between users
- **Endpoints:**
  - `POST /api/users/:id/follow` — follow user (requires `JwtAuthGuard`)
  - `DELETE /api/users/:id/follow` — unfollow user (requires `JwtAuthGuard`)
- **Business logic:**
  - Unique constraint prevents duplicate follows
  - Denormalized counters: `followers_count`, `following_count` on `user_profiles`
  - Mobile service provides follow suggestions and discover people features

#### 2.2.3 User Hierarchy

- **Description:** Manager-subordinate tree structure with role-based promotions
- **Endpoints (all `JwtAuthGuard`):**
  - `POST /api/users/:id/set-manager` — assign manager
  - `POST /api/users/:id/hierarchy/manage' — manage hierarchy relationships
  - `POST /api/users/:id/promote-admin` — promote to admin
  - `POST /api/users/:id/demote-admin` — demote from admin
  - `POST /api/users/:id/promote-volunteer` — promote to volunteer
  - `GET /api/users/eligible-for-promotion/:adminId` — list of eligible users
  - `GET /api/users/hierarchy/tree` — full hierarchy tree
  - `GET /api/users/:id/hierarchy` — user's hierarchy branch
- **Business logic:**
  - `parent_manager_id` self-referencing FK on `user_profiles` — used for **reporting structure** (who manages whom). A **volunteer manager** is a user whose **direct reports** (`parent_manager_id' pointing to them) are volunteers or other volunteer managers under their subtree.
  - Roles (intended model; see §10 for implementation gaps): `user`, `volunteer`, **`volunteer_manager`** (manager volunteer), **`operator`** (caller - see §2.14), `admin`, `org_admin`, `super_admin`
  - Stored as PostgreSQL `TEXT[]` array on `user_profiles.roles`

#### 2.2.4 User Statistics

- **Description:** Per-user activity statistics
- **Endpoints:**
  - `GET /api/users/stats/summary` — aggregated user stats
  - `GET /api/users/:id/activities` — user activity feed
  - `GET /api/users/:id/stats` — individual user stats

#### 2.2.5 Volunteer manager, reporting tree, and organization-affiliated volunteers

- **Volunteer manager (`volunteer_manager`):**
  - **Description:** A volunteer role that **supervises other volunteers** through the same hierarchy mechanism as other managers: subordinates have `parent_manager_id` set to the volunteer manager's `user_profiles.id`.
  - **Inputs:** Promotion/assignment flows (e.g. extend `promote-volunteer` / hierarchy APIs to grant `volunteer_manager` and set reporting lines — exact endpoints to align with product policy).
  - **Outputs:** JWT/`roles` includes `volunteer_manager`; hierarchy APIs return subtree of managed volunteers.
  - **Business logic:**
    - A volunteer manager **may** retain the `volunteer` role in addition to `volunteer_manager`, or be represented solely by `volunteer_manager` depending on product rules.
    - **Volunteers under a volunteer manager** are users in the subtree where each node's `parent_manager_id' chain leads to that manager (not necessarily only direct children).
  - **Edge cases:** Circular manager assignments must be rejected; demoting a manager should reassign or clear `parent_manager_id` for dependents (policy-dependent).ation-affiliated volunteer:**
  - **Description:** A volunteer (or volunteer manager) who is **formally linked to an organization** (e.g. NGO chapter) for attribution, onboarding, and organization-scoped features.
  - **Inputs:** Organization identifier on the user profile or via `organization_applications' / membership join workflow.
  - **Outputs:** Profile and APIs expose organization linkage where allowed by privacy rules.
  - **Business logic:** The schema includes `organizations` and `organization_applications`; **a durable FK from `user_profiles` to `organizations` (or a membership table) is a product requirement** — there is not enough information in the code to determine whether this FK already exists; the SRS treats it as the required model once implemented.
  - **Edge cases:** User leaves organization — link end-dated or removed; org admin vs platform admin permissions must not conflict.

#### 2.2.6 Personalized profile screen (presentation)

- **Description:** The **profile screen** SHALL adapt **layout, sections, and default tab** based on the signed-in user's **roles** (e.g. volunteer, volunteer manager, operator, org volunteer, admin) and **user-controlled preferences** stored in `settings` (JSONB) or equivalent.
- **Inputs:** `roles[]`, optional `organization_id` / org membership, `settings` keys for profile UI (e.g. default tab, hidden sections).
- **Outputs:** Rendered profile with role-appropriate modules (e.g. volunteer manager: quick link to "my volunteers" / hierarchy snippet; org volunteer: org badge and org-scoped stats if any; operator: link to matching queue — see §2.14).
- **Business logic:** Same underlying `GET /api/users/:id` data; client **and** future server-driven layout fragments may enforce consistency; respect i18n and RTL.
- **Edge cases:** Guest mode — limited or generic profile; viewing **another** user's profile uses public-safe fields only.