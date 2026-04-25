# Software Requirements Specification (SRS)

## Karma Community (KC) Platform

**Version:** 2.0  
**Generated from codebase:** kc-monorepo v1.0.0  
**API version:** @kc/api 2.5.3  
**Mobile version:** @kc/mobile 2.4.2  
**Date:** 2026-04-12

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Design](#6-database-design)
7. [Data Flow](#7-data-flow)
8. [External Integrations](#8-external-integrations)
9. [Configuration & Environment](#9-configuration--environment)
10. [Gaps & Assumptions](#10-gaps--assumptions)

---

## 1. System Overview

### 1.1 System Purpose

Karma Community (KC) is a **community-oriented social platform** designed to facilitate volunteering, donations, ride-sharing, community challenges, and social interactions. The platform enables community members to contribute through multiple avenues — donating goods/money/time/knowledge, offering rides, participating in personal and group challenges, and engaging through a social feed with posts, likes, and comments. KC also provides an **operator-assisted matching** capability ("Shiduchim Tov" / Good Matching) where trained call-center operators review high-privacy requests and manually pair community needs with suitable volunteers or donors (see §2.14 and §2.15).

### 1.2 Target Users

- **Community members** — individuals who donate, volunteer, request help, or participate in community activities
- **Volunteers** — active community contributors (base volunteer role)
- **Volunteer managers (מתנדב מנהל)** — volunteers who supervise other volunteers in a reporting tree (see §2.2.5)
- **Organization-affiliated volunteers** — volunteers linked to a specific organization (see §2.2.5)
- **Operators (מוקדנים)** — call-center brokers who triage high-privacy posts, review needs and capabilities, and manually propose matches between requesters and volunteers/donors (see §2.14). This is a **new persona** requiring the `operator` role (not yet implemented in code — see §10.1)
- **Organization administrators** — manage organizations within the community
- **System administrators** — full platform management, user promotion, CRM, task management

### 1.3 Core Capabilities

- **User authentication** — email/password, Google OAuth, Firebase Auth, guest mode
- **Donations management** — money, items, time, knowledge across 30+ categories
- **Ride-sharing** — offer and book community rides
- **Social feed** — posts (multiple types), likes, comments, hide/unhide, reels view; **filtering and sorting** of feed content (see §2.5.6)
- **Post anonymity levels** — per-post privacy control allowing authors to choose from four graduated visibility levels: operators only, operators + followers, public limited, and fully public (see §2.5.7)
- **Operator matching ("Shiduchim Tov")** — human-in-the-loop call-center workflow where operators review anonymised requests and manually propose volunteer/donor matches (see §2.14, §2.15)
- **Chat** — real-time messaging with conversations, read receipts, reactions
- **Personal challenges (timers)** — habit tracking with streaks, resets, records
- **Community group challenges** — shared goals with entries, participants, leaderboards
- **Items delivery** — item listing, reservation, delivery requests
- **Notifications** — push (Expo), local, polling-based notification system
- **User hierarchy** — manager trees, role-based access (`user`, `volunteer`, `volunteer_manager`, `operator`, `admin`, `org_admin`, `super_admin`) plus **organization-linked volunteers** (see §2.2.5)
- **Profile experience** — **personalized profile screen presentation** (layout, visibility, and emphasis adapted per role and preferences — see §2.2.6)
- **Admin panel** — dynamic tables, CRM, task management, file management, time tracking
- **Community statistics** — dashboard, real-time metrics, city-based stats, trends
- **Follow system** — follow/unfollow users, followers/following lists, discover people
- **Organizational support** — organization creation, applications, approval workflows
- **Multi-language** — Hebrew (default) and English, full RTL support
- **Landing website** — web mode for public-facing site vs. authenticated app

### 1.4 High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Clients                            │
│  ┌─────────────┐  ┌─────────────┐                    │
│  │ Mobile App  │  │  Web App    │                    │
│  │ (Expo/RN)   │  │ (Expo Web)  │                    │
│  └──────┬──────┘  └──────┬──────┘                    │
└─────────┼────────────────┼──────────────────────────┘
          │                │
          ▼                ▼
┌──────────────────────────────────────────────────────┐
│              NestJS API Server (:3001)                │
│  ┌────────┐ ┌────────┐ ┌──────┐ ┌────────────────┐  │
│  │  Auth  │ │ Users  │ │Posts │ │  Donations/    │  │
│  │Module  │ │Module  │ │Module│ │  Rides/Items   │  │
│  ├────────┤ ├────────┤ ├──────┤ ├────────────────┤  │
│  │ Stats  │ │ Chat   │ │Admin │ │  Challenges    │  │
│  │Module  │ │Module  │ │Module│ │  Module        │  │
│  ├────────┤ ├────────┤ ├──────┤ ├────────────────┤  │
│  │Operator│ │        │ │      │ │                │  │
│  │Matching│ │        │ │      │ │                │  │
│  │Module  │ │        │ │      │ │                │  │
│  └────────┘ └────────┘ └──────┘ └────────────────┘  │
└───────────┬──────────────────────┬───────────────────┘
            │                      │
            ▼                      ▼
┌──────────────────┐    ┌──────────────────┐
│   PostgreSQL 15  │    │    Redis 7       │
│   (Primary DB)   │    │   (Cache/Auth)   │
└──────────────────┘    └──────────────────┘
```

**Monorepo structure (npm workspaces):**

| Workspace | Path | Description |
|-----------|------|-------------|
| `@kc/api` | `apps/api` | NestJS backend server |
| `@kc/mobile` | `apps/mobile` | Expo/React Native mobile + web app |
| `@kc/shared-types` | `packages/shared-types` | Shared TypeScript types (API contract) |
| `@kc/config-eslint` | `packages/config-eslint` | Shared ESLint configuration |

**Deployment:** Railway (API + Mobile web export via Docker)

---

## 2. Functional Requirements

### 2.1 Authentication Module (`modules/auth`)

#### 2.1.1 Email Registration

- **Description:** Register a new user with email and password
- **Endpoint:** `POST /auth/register` and `POST /api/users/register`
- **Inputs:** email, password, name, optional profile fields
- **Outputs:** `ApiResponse` with user data and JWT token pair (`accessToken`, `refreshToken`, `expiresIn`, `refreshExpiresIn`)
- **Business logic:**
  - Password hashed with `argon2`
  - JWT token pair created (HMAC-SHA256, access 1h, refresh 30d)
  - Refresh token stored in Redis with TTL
  - User profile created in `user_profiles` table
  - `ROOT_ADMIN_EMAIL` auto-promoted to `super_admin` on first login
- **Edge cases:**
  - Duplicate email returns error
  - `JWT_SECRET` must be ≥ 32 characters or server refuses to start

#### 2.1.2 Email Login

- **Description:** Authenticate existing user with email/password
- **Endpoint:** `POST /auth/login` and `POST /api/users/login`
- **Inputs:** email, password
- **Outputs:** JWT token pair + user data
- **Business logic:**
  - Credential verification via `argon2.verify`
  - New session created with unique `sessionId`
  - Rate-limited via `ThrottlerGuard` (60 req/60s on auth controller)

#### 2.1.3 Google OAuth

- **Description:** Authenticate via Google Sign-In
- **Endpoint:** `POST /auth/google`
- **Inputs:** Google ID token
- **Outputs:** JWT token pair + user data
- **Business logic:**
  - Token verified via `google-auth-library`
  - User matched/created by `google_id` or `email`
  - Firebase UID linked if available

#### 2.1.4 Token Refresh

- **Description:** Refresh expired access token using refresh token
- **Endpoint:** `POST /auth/refresh`
- **Inputs:** refresh token
- **Outputs:** New access token + expiry
- **Business logic:**
  - Verify refresh token signature + Redis existence
  - Fetch **latest roles from database** (ensures role changes propagate)
  - Issue new access token with same session ID

#### 2.1.5 Email Availability Check

- **Description:** Check if email is already registered
- **Endpoint:** `GET /auth/check-email`
- **Inputs:** email (query parameter)
- **Outputs:** Boolean availability

#### 2.1.6 User ID Resolution

- **Description:** Resolve user identity from Firebase UID, Google ID, or email
- **Endpoint:** `POST /api/users/resolve-id`
- **Inputs:** `firebase_uid`, `google_id`, `email`
- **Outputs:** Resolved user profile + JWT tokens
- **Business logic:** Tries matching by `firebase_uid` → `google_id` → `email`; creates user if none found

#### 2.1.7 Session Management

- **Description:** Redis-based session management
- **Endpoints:**
  - `POST /session/login` — create session
  - `GET /session/validate/:sessionId` — validate session
  - `GET /session/user/:userId` — list user sessions
  - `DELETE /session/logout/:sessionId` — single session logout
  - `DELETE /session/logout-all/:userId` — logout all sessions
  - `GET /session/stats` — session statistics
  - `GET /session/protected` — test protected endpoint
- **Business logic:** Sessions stored in Redis with prefix `session:`, TTL 24 hours

#### 2.1.8 Token Revocation

- **Description:** Blacklist tokens upon logout
- **Business logic:**
  - Blacklisted tokens stored in Redis with key `blacklisted_token:{hash}` and remaining TTL
  - Token hash computed via SHA-256
  - Refresh token removed from Redis storage

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
  - Profile updates restricted to authenticated user or admin

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
  - `POST /api/users/:id/hierarchy/manage` — manage hierarchy relationships
  - `POST /api/users/:id/promote-admin` — promote to admin
  - `POST /api/users/:id/demote-admin` — demote from admin
  - `POST /api/users/:id/promote-volunteer` — promote to volunteer
  - `GET /api/users/eligible-for-promotion/:adminId` — list promotable users
  - `GET /api/users/hierarchy/tree` — full hierarchy tree
  - `GET /api/users/:id/hierarchy` — user's hierarchy branch
- **Business logic:**
  - `parent_manager_id` self-referencing FK on `user_profiles` — used for **reporting structure** (who manages whom). A **volunteer manager** is a user whose **direct reports** (`parent_manager_id` pointing to them) are volunteers or other volunteer managers under their subtree.
  - Roles (intended model; see §10 for implementation gaps): `user`, `volunteer`, **`volunteer_manager`** (מתנדב מנהל), **`operator`** (מוקדן — see §2.14), `admin`, `org_admin`, `super_admin`
  - Stored as PostgreSQL `TEXT[]` array on `user_profiles.roles`

#### 2.2.4 User Statistics

- **Description:** Per-user activity statistics
- **Endpoints:**
  - `GET /api/users/stats/summary` — aggregated user stats
  - `GET /api/users/:id/activities` — user activity feed
  - `GET /api/users/:id/stats` — individual user stats

#### 2.2.5 Volunteer manager, reporting tree, and organization-affiliated volunteers

- **Volunteer manager (`volunteer_manager` / מתנדב מנהל):**
  - **Description:** A volunteer role that **supervises other volunteers** through the same hierarchy mechanism as other managers: subordinates have `parent_manager_id` set to the volunteer manager's `user_profiles.id`.
  - **Inputs:** Promotion/assignment flows (e.g. extend `promote-volunteer` / hierarchy APIs to grant `volunteer_manager` and set reporting lines — exact endpoints to align with product policy).
  - **Outputs:** JWT/`roles` includes `volunteer_manager`; hierarchy APIs return subtree of managed volunteers.
  - **Business logic:**
    - A volunteer manager **may** retain the `volunteer` role in addition to `volunteer_manager`, or be represented solely by `volunteer_manager` depending on product rules.
    - **Volunteers under a volunteer manager** are users in the subtree where each node's `parent_manager_id` chain leads to that manager (not necessarily only direct children).
  - **Edge cases:** Circular manager assignments must be rejected; demoting a manager should reassign or clear `parent_manager_id` for dependents (policy-dependent).

- **Organization-affiliated volunteer:**
  - **Description:** A volunteer (or volunteer manager) who is **formally linked to an organization** (e.g. NGO chapter) for attribution, onboarding, and org-scoped features.
  - **Inputs:** Organization identifier on the user profile or via `organization_applications` / membership join workflow.
  - **Outputs:** Profile and APIs expose organization linkage where allowed by privacy rules.
  - **Business logic:** The schema includes `organizations` and `organization_applications`; **a durable FK from `user_profiles` to `organizations` (or a membership table) is a product requirement** — אין מספיק מידע בקוד כדי לקבוע whether this FK already exists; the SRS treats it as the required model once implemented.
  - **Edge cases:** User leaves organization — link end-dated or removed; org admin vs platform admin permissions must not conflict.

#### 2.2.6 Personalized profile screen (presentation)

- **Description:** The **profile screen** SHALL adapt **layout, sections, and default tab** based on the signed-in user's **roles** (e.g. volunteer, volunteer manager, operator, org volunteer, admin) and **user-controlled preferences** stored in `settings` (JSONB) or equivalent.
- **Inputs:** `roles[]`, optional `organization_id` / org membership, `settings` keys for profile UI (e.g. default tab, hidden sections).
- **Outputs:** Rendered profile with role-appropriate modules (e.g. volunteer manager: quick link to "my volunteers" / hierarchy snippet; org volunteer: org badge and org-scoped stats if any; operator: link to matching queue — see §2.14).
- **Business logic:** Same underlying `GET /api/users/:id` data; client **and** future server-driven layout fragments may enforce consistency; respect i18n and RTL.
- **Edge cases:** Guest mode — limited or generic profile; viewing **another** user's profile uses public-safe fields only.

### 2.3 Donations Module (`modules/donations`)

#### 2.3.1 Donation Categories

- **Description:** Categorized donation types
- **Endpoints:**
  - `GET /api/donations/categories` — list all categories
  - `GET /api/donations/categories/:slug` — get category by slug
- **Categories observed in mobile navigation (30+):**
  - **Money**, **Items** (food, clothes, books, furniture, medical, technology, games, plants, waste, art, sports, music, recipes, riddles), **Time**, **Knowledge**, **Animals**, **Housing**, **Support**, **Education**, **Environment**, **Mental Health**, **Languages**, **Dreams**, **Fertility**, **Jobs**, **Matchmaking** (שידוכים — romantic/singles, see §2.3.3), **Golden Age**

#### 2.3.2 Donation CRUD

- **Description:** Create, read, update, delete donations
- **Endpoints:**
  - `POST /api/donations` — create (requires `JwtAuthGuard`)
  - `GET /api/donations` — list donations
  - `GET /api/donations/:id` — get by ID
  - `PUT /api/donations/:id` — update (requires `JwtAuthGuard`)
  - `DELETE /api/donations/:id` — delete (requires `JwtAuthGuard`)
  - `GET /api/donations/user/:userId` — user's donations
  - `GET /api/donations/stats/summary` — donation statistics
- **Business logic:** SQL-based CRUD in controller (no separate service file)
- **Database:** `donations` table with donor/recipient UUIDs, amounts, category reference

#### 2.3.3 Donation Category Naming: Matchmaking vs Shiduchim Tov

This section disambiguates two distinct concepts that share similar Hebrew vocabulary.

| Attribute | Matchmaking (שידוכים) | Shiduchim Tov (שידוכים טוב) — Good Matching |
|-----------|----------------------|----------------------------------------------|
| **Internal slug** | `matchmaking` (as implemented) | `shiduchim-tov` (required — see §10.1) |
| **Hebrew UI label** | "שידוכים" | "שידוכים טוב" |
| **English UI label** | "Matchmaking" | "Good Matching" |
| **Purpose** | Volunteering to help **singles** find romantic partners — connecting matchmakers with people seeking introductions | **Social-good matching**: coordinating community **needs** (requests for help) with **volunteers/donors** (capabilities), managed by trained **operators** (call-center brokers) |
| **User experience** | Standard donation-category screen with informational content and optional external resources | Dedicated **operator workspace** with matching queue, case detail, candidate lists, and action flows (see §2.15) |
| **Visible to** | All authenticated users (standard category) | All authenticated users see an **explainer / entry** view; **operators** see the full workspace (queue + matching tools) |
| **Related module** | §2.3 Donations | §2.14 Operator Matching, §2.15 Shiduchim Tov Workspace |

**Product decision:** The existing `matchmaking` category (`MatchmakingScreen` at `donationScreens/MatchmakingScreen.tsx`, i18n key `donations:categories.matchmaking`) SHALL remain unchanged. "Shiduchim Tov" is an **additional, separate** top-level entry (see §2.15, §4.4) — **not** a replacement.

**i18n guidance (implementation note):** New locale keys SHOULD be added under `donations:categories.shiduchimTov` (or a dedicated namespace `operator`) for Hebrew and English. Existing `donations:categories.matchmaking` keys remain untouched. Strings belong in `locales/he/*.json` and `locales/en/*.json` — the SRS only describes naming intent.

### 2.4 Rides Module (`modules/rides`)

#### 2.4.1 Ride Management

- **Description:** Community ride-sharing — offer and book rides
- **Endpoints:**
  - `POST /api/rides` — create ride offer
  - `GET /api/rides` — list rides
  - `GET /api/rides/:id` — get ride details
  - `POST /api/rides/:id/book` — book a ride
  - `PUT /api/rides/bookings/:bookingId/status` — update booking status
  - `GET /api/rides/user/:userId` — user's rides
  - `GET /api/rides/stats/summary` — ride statistics
  - `PUT /api/rides/:id` — update ride
  - `DELETE /api/rides/:id` — delete ride
- **Business logic:** SQL-based in controller; unique constraint on `(ride_id, passenger_id)` prevents double booking
- **Database:** `rides` table + `ride_bookings` table

### 2.5 Posts Module (`modules/posts`)

#### 2.5.1 Social Feed

- **Description:** Multi-type post feed with social interactions; **filtering and sorting** are specified in §2.5.6; **anonymity levels** in §2.5.7.
- **Endpoints:**
  - `GET /api/posts` — paginated post feed
  - `GET /api/posts/user/:userId` — user's posts

#### 2.5.2 Post Likes

- **Endpoints:**
  - `POST /api/posts/:postId/like` — toggle like (requires `JwtAuthGuard`)
  - `GET /api/posts/:postId/likes` — get post likes
  - `GET /api/posts/:postId/likes/check/:userId` — check if user liked
- **Business logic:**
  - Toggle behavior (like/unlike in single endpoint)
  - Denormalized `likes_count` on `posts` via trigger

#### 2.5.3 Comments

- **Endpoints:**
  - `POST /api/posts/:postId/comments` — add comment (requires `JwtAuthGuard`)
  - `GET /api/posts/:postId/comments` — list comments
  - `PUT /api/posts/:postId/comments/:commentId` — edit comment (requires `JwtAuthGuard`)
  - `DELETE /api/posts/:postId/comments/:commentId` — delete comment (requires `JwtAuthGuard`)
  - `POST /api/posts/:postId/comments/:commentId/like` — toggle comment like (requires `JwtAuthGuard`)
- **Business logic:**
  - Comment text validated: 1–2000 characters (CHECK constraint)
  - Denormalized `comments_count` on `posts` via trigger
  - Denormalized `likes_count` on `post_comments` via trigger

#### 2.5.4 Post Moderation

- **Endpoints:**
  - `PUT /api/posts/:postId` — update post (requires `JwtAuthGuard`)
  - `POST /api/posts/:postId/hide` — hide post (requires `JwtAuthGuard`)
  - `POST /api/posts/:postId/unhide` — unhide post (requires `JwtAuthGuard`)
  - `DELETE /api/posts/:postId` — delete post (requires `JwtAuthGuard`)
- **Business logic:**
  - Delete cascades by `post_type` (different cleanup logic per type)
  - Posts linked to rides, items, tasks, and community challenges via FK

#### 2.5.5 Post Types

Posts support multiple types linked to other entities:
- Regular posts (social content)
- Donation item cards
- Item delivered cards
- Ride offered / ride completed cards
- Task assignment / task completion cards
- Community challenge posts (via `community_challenge_id` FK)

#### 2.5.6 Feed filtering and sorting

- **Description:** Users SHALL be able to **filter** and **sort** the main post feed so they can focus on relevant content (e.g. by post type, date, engagement, or org-related posts when applicable).
- **Inputs (conceptual):**
  - **Filters:** e.g. `post_type`, date range, author, hidden-only vs visible-only, optional "organization / my team" scope when org linkage exists.
  - **Sort:** e.g. `created_at` ascending/descending, `likes_count`, "most commented", or "recent activity".
- **Outputs:** Paginated list of posts consistent with filter/sort; stable cursor or page index for infinite scroll.
- **Business logic:**
  - **API:** `GET /api/posts` SHALL accept documented query parameters for filter and sort (or a dedicated `GET /api/posts/feed` if preferred). Current implementation may only support pagination — **אין מספיק מידע בקוד כדי לקבוע** full query contract without reading `posts.controller.ts` / service; this section states the **required behavior** for the product.
  - **Client:** Feed header / `FilterSortOptions` (or equivalent) SHALL bind to these parameters and persist last-used preferences in local storage where UX requires.
- **Edge cases:** Combining filters that yield zero results; performance on large datasets (indexes on `posts.created_at`, `post_type`, `author_id`).

#### 2.5.7 Post Anonymity Levels

- **Description:** Each post SHALL have an **anonymity level** (`anonymity_level`) set by the author at creation time and optionally editable before any operator or public interaction has occurred. The level controls **who can see the post content and the author's identity**.

- **Anonymity level definitions:**

  **Level 1 — Operators only ("חשוף רק למוקדנים")**

  | Aspect | Detail |
  |--------|--------|
  | **Description** | Content and all identity details visible **only** to users with the `operator` role. The post does NOT appear in any public feed, follower feed, or search result. It enters the **operator matching queue** (§2.14) for manual triage. |
  | **Who can see what** | **Operators:** full post content, author identity (name, avatar, contact fields), location, category, and any attached metadata. **Followers / authenticated users / guests:** post is completely hidden — excluded from all feed queries and profile post lists. **Admins:** full access for moderation and audit purposes. |
  | **Inputs** | Author selects `anonymity_level = 1` during post creation (or edit, subject to rules below). Author MAY optionally provide additional structured fields for the operator: e.g. urgency, preferred contact method, specific need description stored in `posts.metadata`. |
  | **Outputs** | Post excluded from `GET /api/posts` for non-operators. Included in `GET /api/operator/queue` (§2.14). Notification dispatched to on-duty operators (see §2.14.3). |
  | **Business rules** | Default: not the default level — author must explicitly opt in. Author MAY downgrade to level 2, 3, or 4 only if the post has not yet been assigned to a match case (`matching_cases.status` is null or `unassigned`). Once an operator has begun working a case, the author SHOULD request level change through the operator (product policy). Operators SHALL NOT share author identity outside the operator workspace unless the author grants explicit consent or the match flow results in mutual opt-in (§2.14.4). |
  | **Edge cases** | **Reports:** Admins can view the post for moderation even though it is invisible to the public. **Legal retention:** Post and identity data are retained per platform data-retention policy even if the author later deletes the post; audit log records the deletion event. **Author views own post:** Author can always see their own post in their profile's "my posts" section, tagged with an "operators only" badge. |

  **Level 2 — Operators + followers ("חשוף גם לחברים (עוקבים)")**

  | Aspect | Detail |
  |--------|--------|
  | **Description** | Same high-privacy treatment for the general public, but the author's **followers** (per `user_follows`) may see a **scoped view** of the post. Operators still see the full matching context. |
  | **Who can see what** | **Operators:** identical to Level 1 — full content and identity. **Followers:** see post title, description text, category, and creation timestamp; author displayed as **first name + last initial** (e.g. "David S.") with a generic avatar unless the author has opted to show their real avatar to followers. Contact details (phone, email, exact address) are **masked**. Followers MAY interact (like, comment) but cannot view the author's full profile link — tapping the author name shows a "private profile" placeholder. **Non-follower authenticated users / guests:** post is hidden (same as Level 1). **Admins:** full access. |
  | **Inputs** | Author selects `anonymity_level = 2`. Same optional metadata fields as Level 1. |
  | **Outputs** | Post appears in `GET /api/posts` only for users in the author's follower set (server-side `JOIN user_follows`). Also appears in the operator queue if configured by policy (product decision: **YES** — Level 2 posts SHALL also enter the operator queue for potential matching assistance, but operators are not required to act on them). |
  | **Business rules** | Author MAY change from Level 2 → Level 1 (restrict further) at any time. Downgrade to Level 3/4 allowed only before any match case is opened. Follower interaction (likes/comments) is visible to the author and other followers but not to the general public. |
  | **Edge cases** | If a follower unfollows the author after seeing the post, the post disappears from their feed on next refresh. Comment history from unfollowed user remains but author name is masked. |

  **Level 3 — Public limited ("חשוף לכולם בלי כל הפרטים")**

  | Aspect | Detail |
  |--------|--------|
  | **Description** | Post is visible in the broader public feed with **strong redaction** of identifying details. Intended for users who want community visibility for their need/offer but prefer privacy. |
  | **Who can see what** | **All authenticated users:** see post title, description, category, approximate location (city-level only — no street address), and creation timestamp. Author displayed as **anonymised placeholder** ("Community Member" / "חבר/ת קהילה") with a system-default avatar. No direct contact details exposed. **Guests:** see post in public feed with same redactions as authenticated users. **Operators:** see full unredacted content and author identity (same as Level 1/2) — **product decision: operators MAY access richer internal fields for Level 3 posts to assist if the author later requests help**. **Admins:** full access. |
  | **Inputs** | Author selects `anonymity_level = 3`. |
  | **Outputs** | Post included in `GET /api/posts` for all users with redacted author fields. Post does NOT automatically enter the operator queue (unlike Levels 1–2). Author MAY later choose to "request operator help" which would create a match case from this post (see §2.14). |
  | **Business rules** | Author MAY upgrade privacy (move to Level 1 or 2) at any time. Downgrade to Level 4 (fully public) is a **one-way reveal** — once identity is published, it cannot be re-anonymised for users who already saw it (though the post can be deleted). Likes and comments are public. Users cannot DM the author directly from the post — a "contact through platform" button SHALL open a moderated request flow or display a message "contact not available". |
  | **Edge cases** | If the post is linked to a donation/ride/item entity, the linked entity's own visibility rules also apply — the more restrictive level wins. Search indexing excludes author identity fields. |

  **Level 4 — Fully public ("חשוף לגמרי")**

  | Aspect | Detail |
  |--------|--------|
  | **Description** | Normal public post visibility consistent with existing post types and the current privacy model. Author identity is fully visible. |
  | **Who can see what** | **All authenticated users:** full post content, author name, avatar, city, and profile link. **Guests:** same (subject to existing guest-mode restrictions). **Operators:** same as any other user (no special queue routing). **Admins:** full access. |
  | **Inputs** | Author selects `anonymity_level = 4` or does not specify (this is the **default** for backward compatibility with existing posts). |
  | **Outputs** | Standard feed inclusion. No operator queue routing. |
  | **Business rules** | This is the **default** level. Existing posts without an `anonymity_level` value SHALL be treated as Level 4. Author MAY upgrade privacy to Level 1–3 at any time (subject to match-case rules above). |
  | **Edge cases** | Identical to current post behavior. No new edge cases introduced. |

- **Cross-cutting rules for all levels:**
  - The `anonymity_level` column SHALL be stored as `SMALLINT` on the `posts` table (see §6.1.8) with a `CHECK (anonymity_level BETWEEN 1 AND 4)` and `DEFAULT 4`.
  - **Admin moderation:** Admins and super-admins can always view the full unredacted post regardless of level, for content moderation, legal compliance, and abuse investigation.
  - **Post creation flow (mobile):** The post-creation UI SHALL present the four options with clear Hebrew/English labels, a brief explanation of each level, and a visual indicator (e.g. lock icon gradient). The selected level is sent as part of the create-post DTO.
  - **API filtering:** `GET /api/posts` SHALL implement server-side filtering logic that checks `anonymity_level` against the requesting user's role and follow relationship to the author. This is a **required** behavior — אין מספיק מידע בקוד כדי לקבוע whether any filtering logic exists today; the current `posts.service.ts` does not reference `anonymity_level` (see §10.1).
  - **Notifications:** When a post with Level 1 or 2 is created, a notification SHALL be dispatched to active operators (see §2.14.3). For Level 2, a separate notification MAY be sent to followers per the existing notification pattern.

### 2.6 Items Module (`modules/items`)

#### 2.6.1 Generic Collections

- **Description:** Key-value collection storage
- **Controller prefix:** `/api/collections`
- **Endpoints:**
  - `GET /api/collections/:collection/:userId/:itemId` — get item
  - `GET /api/collections/:collection` — list collection
  - `POST /api/collections/:collection` — create item
  - `PUT /api/collections/:collection/:userId/:itemId` — update item
  - `DELETE /api/collections/:collection/:userId/:itemId` — delete item
  - `GET /api/collections/user-activity/:userId` — user activity
  - `GET /api/collections/popular-collections` — popular collections
  - `GET /api/collections/cache-stats` — cache statistics

#### 2.6.2 Dedicated Items

- **Description:** Typed items with structured fields
- **Controller prefix:** `/api/dedicated-items`
- **Endpoints:**
  - `POST /api/dedicated-items` — create item
  - `GET /api/dedicated-items/owner/:ownerId` — list by owner
  - `GET /api/dedicated-items/:id` — get by ID
  - `PUT /api/dedicated-items/:id` — update
  - `DELETE /api/dedicated-items/:id` — soft delete
  - `GET /api/dedicated-items/category/:category` — list by category
  - `GET /api/dedicated-items/search` — search items
- **Item fields:** title, description, category (furniture, electronics, clothing, books, food, toys, appliances, sports, tools, medical, other), condition (new, like_new, good, fair, poor), city, address, coordinates, price, image, rating, tags, quantity, delivery_method, status

#### 2.6.3 Items Delivery

- **Description:** Item delivery workflow with reservation and request management
- **Controller prefix:** `/api/items-delivery`
- **Endpoints:**
  - `POST /api/items-delivery` — create delivery item
  - `GET /api/items-delivery/search` — search items
  - `GET /api/items-delivery/user/:userId` — user's items
  - `GET /api/items-delivery` — list all
  - `GET /api/items-delivery/:id` — get by ID
  - `PUT /api/items-delivery/:id` — update
  - `DELETE /api/items-delivery/:id` — delete
  - `POST /api/items-delivery/:id/reserve` — reserve item
  - `POST /api/items-delivery/requests` — create delivery request
  - `GET /api/items-delivery/requests` — list requests
  - `PUT /api/items-delivery/requests/:requestId` — update request status
  - `POST /api/items-delivery/:id/deliver` — mark as delivered
- **Item request fields:** item_id, requester_id, message, proposed_time, delivery_method, meeting_location
- **Request statuses:** pending, approved, rejected, completed (inferred from `UpdateItemRequestDto`)

### 2.7 Chat Module (`modules/chat`)

#### 2.7.1 Conversations & Messaging

- **Description:** Direct messaging between users
- **Controller prefix:** `/api/chat`
- **Guard:** `OptionalAuthGuard` (allows guest read access)
- **Endpoints:**
  - `POST /api/chat/conversations` — create conversation
  - `GET /api/chat/conversations/user/:userId` — list user's conversations
  - `GET /api/chat/conversations/:conversationId/messages` — get messages
  - `POST /api/chat/messages` — send message
  - `POST /api/chat/conversations/:conversationId/read-all` — mark all as read
  - `POST /api/chat/messages/:messageId/read` — mark message as read
- **Database:**
  - `chat_conversations` with `participants` UUID array + GIN index
  - `chat_messages` with `conversation_id` FK
  - `message_read_receipts` with unique constraint on `(message_id, user_id)`
- **Mobile features (client-side service):**
  - Subscribe to messages and conversations (polling or local DB)
  - Edit/delete messages
  - Message reactions (add/remove)
  - Voice messages
  - Typing status
  - Message search

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
  - `POST /api/challenges/record-breaks` — log record break
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

### 2.9 Notifications Module (`modules/notifications`)

#### 2.9.1 Notification Management

- **Description:** User notifications with read/unread tracking
- **Controller prefix:** `/api/notifications`
- **Guards:** `ThrottlerGuard` + `JwtAuthGuard` on entire controller
- **Endpoints:**
  - `GET /api/notifications/:userId` — get user notifications
  - `POST /api/notifications/:userId/read-all` — mark all as read
  - `PUT /api/notifications/:userId/:notificationId/read` — mark one as read
  - `DELETE /api/notifications/:userId/:notificationId` — delete notification
  - `DELETE /api/notifications/:userId` — clear all
- **Database:** Two tables exist:
  - `user_notifications` (in `schema.sql`) — general notifications
  - `notifications` (in `migrations/create_notifications_table.sql`) — with JSONB `data` field, `item_id`
- **Mobile push:** Expo Notifications with polling (5-second interval), local notification scheduling, Android channel configuration

### 2.10 Statistics Module (`modules/stats`)

#### 2.10.1 Community Statistics

- **Description:** Platform-wide analytics and metrics
- **Controller prefix:** `/api/stats`
- **Endpoints:**
  - `GET /api/stats/community` — community stats overview
  - `GET /api/stats/community/version` — stats version (for cache invalidation)
  - `GET /api/stats/community/trends` — time-series trends
  - `GET /api/stats/community/cities` — city-based statistics
  - `POST /api/stats/track-visit` — track site visit
  - `POST /api/stats/increment` — increment stat (requires `JwtAuthGuard`)
  - `GET /api/stats/dashboard` — admin dashboard stats
  - `GET /api/stats/real-time` — real-time metrics (HTTP polling, not WebSocket)
  - `POST /api/stats/community/reset` — reset stats (requires `AdminAuthGuard`)
- **Architecture:** Facade pattern with four services:
  - `StatsQueriesService` — raw SQL metrics
  - `StatsMapperService` — DB rows → API response shapes
  - `ComputedStatsService` — derived/computed statistics
  - `StatsFacadeService` — orchestrates all three + Redis caching
- **Caching:** Redis-based with pattern keys (`community_stats_*`, `dashboard_stats`, `real_time_stats`, etc.)

### 2.11 Admin Module (`modules/admin`)

#### 2.11.1 Dynamic Admin Tables

- **Description:** User-defined database tables for admin data management
- **Controller prefix:** `/api/admin/tables`
- **Guard:** `AdminAuthGuard` on entire controller
- **Endpoints:**
  - `GET /api/admin/tables` — list tables
  - `GET /api/admin/tables/:id` — get table
  - `POST /api/admin/tables` — create table definition
  - `PUT /api/admin/tables/:id` — update table definition
  - `DELETE /api/admin/tables/:id` — delete table
  - `GET /api/admin/tables/:id/rows` — list table rows
  - `POST /api/admin/tables/:id/rows` — add row
  - `PUT /api/admin/tables/:id/rows/:rowId` — update row
  - `DELETE /api/admin/tables/:id/rows/:rowId` — delete row
- **Database:**
  - `admin_tables` — table definitions
  - `admin_table_columns` — column definitions with type constraint (text, number, date)
  - `admin_table_rows` — row data stored as JSONB

#### 2.11.2 Admin Files

- **Controller prefix:** `/api/admin-files`
- **Endpoints:**
  - `GET /api/admin-files` — list files (`JwtAuthGuard`)
  - `GET /api/admin-files/folders` — list folders (`JwtAuthGuard`)
  - `POST /api/admin-files` — upload file (`JwtAuthGuard` + `AdminAuthGuard`)
  - `DELETE /api/admin-files/:id` — delete file (`JwtAuthGuard` + `AdminAuthGuard`)

#### 2.11.3 CRM

- **Controller prefix:** `/api/crm`
- **Endpoints:**
  - `GET /api/crm` — list CRM contacts
  - `POST /api/crm` — create contact
  - `PATCH /api/crm/:id` — update contact
  - `DELETE /api/crm/:id` — delete contact

#### 2.11.4 Task Management

- **Description:** Hierarchical task system with time logging
- **Controller prefix:** `/api/tasks`
- **Endpoints:**
  - `GET /api/tasks` — list tasks
  - `GET /api/tasks/init-table` — initialize tasks schema
  - `GET /api/tasks/:id` — get task
  - `GET /api/tasks/:id/subtasks` — list subtasks
  - `GET /api/tasks/:id/tree` — full task subtree
  - `POST /api/tasks` — create task (`JwtAuthGuard`)
  - `POST /api/tasks/:id/log-hours` — log time (`JwtAuthGuard`)
  - `PATCH /api/tasks/:id` — update task (`AdminAuthGuard`)
  - `DELETE /api/tasks/:id` — delete task (`AdminAuthGuard`)
  - `GET /api/tasks/hours-report/:managerId` — time report (`AdminAuthGuard`)
- **Task fields:** title, description, status (todo, in_progress, review, done, blocked), priority (low, medium, high, urgent), parent_task_id, assignees (TEXT[]), tags (TEXT[]), due_date, estimated_hours
- **Time logging:** `task_time_logs` with unique `(task_id, user_id)`, CHECK `actual_hours > 0`

#### 2.11.5 Community Members

- **Controller prefix:** `/api/community-members`
- **Endpoints:**
  - `GET /api/community-members` — list members
  - `GET /api/community-members/:id` — get member
  - `POST /api/community-members` — add member
  - `PATCH /api/community-members/:id` — update member
  - `DELETE /api/community-members/:id` — delete member

### 2.12 Sync Module (`modules/sync`)

- **Description:** Synchronize Firebase users to local database
- **Controller prefix:** `/api/sync`
- **Guard:** `AdminAuthGuard` on all endpoints
- **Endpoints:**
  - `POST /api/sync/user` — sync single user
  - `POST /api/sync/all` — sync all Firebase users
  - `GET /api/sync/status` — sync status

### 2.13 Shared Module (`shared`)

#### 2.13.1 Health Checks

- **Endpoints:**
  - `GET /` — server root
  - `GET /health` — health check
  - `GET /health/redis` — Redis health check

#### 2.13.2 Google Places

- **Endpoints:**
  - `GET /autocomplete` — place autocomplete (Google Places API)
  - `GET /place-details` — place details
  - `GET /search-stats` — search statistics

#### 2.13.3 Rate Limiting (Development/Test)

- **Controller prefix:** `/rate-limit`
- **Endpoints for testing rate limit behavior:**
  - `POST /rate-limit/test`, `POST /rate-limit/stress-test`, `GET /rate-limit/status`, `DELETE /rate-limit/clear`, `GET /rate-limit/rules`, `GET /rate-limit/stats`, `POST /rate-limit/custom`, `POST /rate-limit/simulate/:endpoint`

#### 2.13.4 Redis Test (Non-Production Only)

- **Controller prefix:** `/redis-test`
- **Condition:** Registered only when `NODE_ENV !== "production"`
- **Endpoints:** `GET /redis-test/info`, `POST /redis-test/set`, `GET /redis-test/get/:key`, `DELETE /redis-test/delete/:key`, `GET /redis-test/keys`, `POST /redis-test/increment/:key`, `POST /redis-test/comprehensive`

### 2.14 Operator Matching Module (NEW — `modules/operator-matching`)

#### 2.14.1 Overview

- **Description:** An end-to-end **manual, human-in-the-loop** matching workflow where trained **operators** (מוקדנים) review high-privacy community requests and pair them with suitable volunteers or donors. This is **not** an automated recommendation engine — operators use judgment, local knowledge, and platform data to propose matches.
- **Relationship to posts:** Posts at **anonymity level 1** (operators only) are **automatically** routed to the matching queue. Posts at **anonymity level 2** (operators + followers) are **also** routed to the queue (product decision — operators may assist even when followers can see the post). Posts at level 3 or 4 are **not** auto-routed but the author may **manually request** operator assistance via a "request help from operator" action, which creates a match case.
- **Role requirement:** A new role string **`operator`** SHALL be added to the `user_profiles.roles` array vocabulary. Only users whose `roles` includes `operator` (or `admin`/`super_admin` for oversight) can access operator endpoints and the matching workspace. **אין מספיק מידע בקוד כדי לקבוע** — the `operator` role does not exist in the current codebase; it must be added to `AdminAuthGuard` or a new `OperatorAuthGuard` (see §10.1).

#### 2.14.2 Matching Queue

- **Description:** A prioritized list of posts awaiting operator attention.
- **Intended endpoints (required — not yet implemented):**
  - `GET /api/operator/queue` — list queue items (requires `OperatorAuthGuard`)
  - `GET /api/operator/queue/:postId` — queue item detail with enriched context
- **Inputs:** Pagination, optional filters (category, city, urgency, date range, unassigned-only).
- **Outputs:** List of posts with: post content, author identity (unredacted for operators), author location, category, creation time, current queue status (`unassigned` | `assigned` | `in_progress`), and the assigned operator (if any).
- **Business logic:**
  - Queue is populated automatically when a post is created with `anonymity_level IN (1, 2)`, or manually when an author of a Level 3/4 post requests operator help.
  - Queue items are ordered by creation time (FIFO) by default; operators MAY re-sort by urgency or category.
  - An operator **claims** a queue item, which sets `assigned_operator_id` and transitions status to `assigned`. Only one operator may be assigned at a time (but reassignment is allowed by admins).
- **Edge cases:** If a post is deleted by the author while in the queue, the queue item is soft-deleted with an audit record. If the author changes `anonymity_level` to 4 (fully public), the queue item is removed (the need for operator mediation no longer applies).

#### 2.14.3 Match Case Management

- **Description:** Once an operator claims a queue item, they create or work within a **match case** — a structured record linking a requester (the post author) with one or more candidate volunteers/donors.
- **Intended endpoints (required — not yet implemented):**
  - `POST /api/operator/cases` — create match case from a queue item (requires `OperatorAuthGuard`)
  - `GET /api/operator/cases` — list cases (with filters: status, operator, date)
  - `GET /api/operator/cases/:caseId` — case detail including candidates and history
  - `PUT /api/operator/cases/:caseId` — update case (status, notes)
  - `POST /api/operator/cases/:caseId/candidates` — propose a candidate match
  - `PUT /api/operator/cases/:caseId/candidates/:candidateId` — update candidate status
  - `GET /api/operator/cases/:caseId/audit` — audit trail for the case
- **Match case data model (see §6.1.13):**
  - `matching_cases`: `id` UUID, `post_id` FK → `posts`, `requester_id` FK → `user_profiles`, `assigned_operator_id` FK → `user_profiles`, `status` (unassigned, assigned, in_progress, proposed, accepted, declined, completed, cancelled), `priority` (low, medium, high, urgent), `category` (derived from post or manually set), `notes` TEXT, `created_at`, `updated_at`, `resolved_at`
  - `matching_candidates`: `id` UUID, `case_id` FK → `matching_cases`, `candidate_user_id` FK → `user_profiles`, `candidate_type` (volunteer, donor), `match_reason` TEXT (operator's rationale), `status` (proposed, accepted, declined, withdrawn), `proposed_at`, `responded_at`
- **Status transitions:**
  ```
  unassigned → assigned → in_progress → proposed → accepted → completed
                                       ↘ declined → in_progress (retry)
                          → cancelled (at any point by admin or author request)
  ```
- **Business logic:**
  - Operators see **candidate suggestions** based on: user category interests, city/geography, volunteer hours, donation history, and availability — presented as a searchable list, **not** auto-ranked by ML (manual human review).
  - When a candidate is proposed, both the requester and the candidate receive **notifications** (see §2.9). The notification content respects anonymity rules: the requester sees "An operator has found a potential match" (no candidate identity until mutual acceptance); the candidate sees a scoped description of the need (no requester identity until mutual acceptance).
  - Upon **mutual acceptance**, both parties are revealed to each other (full name, contact info per platform policy), and optionally a chat conversation is auto-created (via §2.7).
  - **Audit trail:** Every status change, note addition, candidate proposal, and outcome SHALL be logged in `matching_case_audit` (see §6.1.13) with `actor_id`, `action`, `timestamp`, and optional `details` JSONB.

#### 2.14.4 Anonymity Enforcement in Matching

- **Description:** Throughout the matching workflow, the platform SHALL enforce the author's chosen anonymity level:
  - **Operators** always see the full requester identity (this is necessary for them to perform matching).
  - **Candidates** (volunteers/donors) see only a scoped need description until the match is mutually accepted.
  - **Post-acceptance:** Both parties see each other's names and agreed-upon contact details. The platform MAY offer a "platform-mediated contact" option where communication happens through in-app chat rather than revealing personal phone/email.
  - **Post-completion / decline:** Declined candidates' view of the case is cleared; they retain no PII about the requester.
- **Business rules:**
  - Operators SHALL NOT copy requester PII to external systems. Platform audit logs detect bulk data exports.
  - Operator access to the queue and cases SHALL be logged (read access audit per §3.5).

#### 2.14.5 Operator Notifications

- **Description:** Operators SHALL receive timely notifications when:
  - A new post enters the queue (Level 1 or 2 created, or Level 3/4 author requests help).
  - A candidate responds to a proposed match (accepted/declined).
  - An admin reassigns a case.
  - A requester withdraws or deletes their post.
- **Delivery:** Via the existing notification system (§2.9) — push + in-app polling. Operator-specific notification types SHALL be added (e.g. `operator_new_queue_item`, `operator_candidate_response`, `operator_case_reassigned`).

### 2.15 Shiduchim Tov Workspace (NEW — Donations Navigation Entry)

#### 2.15.1 Overview

- **Description:** "Shiduchim Tov" ("שידוכים טוב" / Good Matching) is a **new top-level entry** within the donations experience (same tab/stack pattern as other donation categories). It serves as the **front door** to the operator-assisted matching system (§2.14) from the mobile/web client.
- **Purpose:** Social-good matching — pairing community **needs** (requests for help) with **volunteers/donors** (capabilities) — coordinated by operators. This is distinct from the existing `matchmaking` category which serves romantic matchmakers helping singles (see §2.3.3).

#### 2.15.2 Navigation Integration

- **Location:** A new `Stack.Screen` entry in `DonationsStack.tsx` (verify path: `apps/mobile/navigations/DonationsStack.tsx`). The screen SHALL be named `ShiduchimTovScreen` and registered in `DonationsStackParamList` (in `globals/types.tsx`).
- **Category grid entry:** `DonationsScreen.tsx` (`bottomBarScreens/DonationsScreen.tsx`) SHALL include a new item in `BASE_CATEGORIES`:
  ```
  { id: 'shiduchimTov', icon: 'handshake-outline', screen: 'ShiduchimTovScreen' }
  ```
  (Exact icon name subject to available icon set; use a handshake or link metaphor.)
- **Deep link:** Add `donations/shiduchim-tov/:mode?` to `linkingConfig.ts`.
- **Position:** SHOULD appear near the top of the category grid (product decision — high visibility for the social-good feature).

#### 2.15.3 Non-Operator View (Explainer)

- **Description:** When a user **without** the `operator` role taps "Shiduchim Tov", they see an **explainer screen** describing the service:
  - What is Good Matching (brief paragraph)
  - How to submit a request (create a post with anonymity level 1 or 2, or tap a "Request operator help" CTA)
  - Current community impact stats (e.g. number of matches completed — sourced from `GET /api/stats/community` or a dedicated operator stats endpoint)
  - FAQ section (from i18n strings)
- **CTA buttons:**
  - "Create a private request" → navigates to post creation with `anonymity_level` pre-set to 1.
  - "Learn more" → scrolls to FAQ.
- **Business logic:** No sensitive data is shown to non-operators. Stats are aggregate only (no PII).

#### 2.15.4 Operator View (Workspace)

- **Description:** When a user **with** the `operator` role (or admin/super_admin) taps "Shiduchim Tov", they enter the **operator workspace** — a separate screen flow providing:

  **Queue screen:**
  - List of posts awaiting triage (from `GET /api/operator/queue`).
  - Each item shows: post excerpt (truncated), category, city, creation date, urgency badge, assignment status.
  - Filter controls: by category, city, urgency, assignment status.
  - "Claim" button to assign self as operator for an item.

  **Case detail screen:**
  - Full post content and author identity (visible only because user is operator).
  - Candidate search/browse panel: searchable list of potential volunteers/donors filtered by relevant criteria (category match, city, past activity).
  - "Propose match" action: selects a candidate and records a match reason (free-text note).
  - Status timeline: visual history of the case (created → assigned → proposed → ...).
  - Notes panel: operator can add internal notes visible only to operators.

  **Case list screen:**
  - Operator's assigned cases, filterable by status.
  - Summary cards with current status, last activity, and next required action.

  **Audit trail screen:**
  - Read-only log of all actions on a case (from `GET /api/operator/cases/:caseId/audit`).

- **Screen flow (navigation):**
  ```
  ShiduchimTovScreen
  ├── [non-operator] ExplainerView
  └── [operator] OperatorWorkspace
      ├── OperatorQueueScreen
      ├── OperatorCaseDetailScreen
      ├── OperatorCaseListScreen
      └── OperatorAuditScreen
  ```
  These screens SHALL be registered within `DonationsStack` (or a nested navigator if the team prefers isolation). Verify actual navigation structure during implementation.

- **Business logic:**
  - Workspace data is fetched exclusively from `/api/operator/*` endpoints (§2.14).
  - All operator actions trigger audit log entries.
  - If the operator's role is revoked mid-session, the next API call returns 403 and the client SHALL redirect to the explainer view with a toast message.

---

## 3. Non-Functional Requirements

### 3.1 Performance

- **Rate limiting:**
  - Global: 60 requests per 60 seconds via `@nestjs/throttler` (`ThrottlerGuard`)
  - Per-authenticated-request: 100 requests per 60 seconds per token prefix
  - Block duration: 5 minutes when rate limit exceeded
  - **Operator endpoints:** SHALL apply a separate rate-limit tier — 200 requests per 60 seconds per operator token — to accommodate higher-frequency queue polling during active triage sessions.
- **Database pool:** Max 20 connections, idle timeout 30s, connection timeout 2s
- **Redis:** Connection with retry strategy (`min(times × 200, 2000)ms`), offline queue disabled
- **HTTP server timeout:** 30 seconds
- **Body parser limit:** 5MB (JSON + URL-encoded)
- **Notification polling:** 5-second interval on mobile
- **Stats caching:** Redis-based with pattern invalidation

### 3.2 Security

- **Authentication:**
  - Dual-mode: Custom JWT (HMAC-SHA256) + Firebase ID token fallback
  - Access token: 1 hour expiry
  - Refresh token: 30 days expiry, stored in Redis
  - Token blacklisting via Redis with remaining TTL
  - No auth bypass in development (SEC-003.1: `BYPASS_AUTH` explicitly removed)
  - JWT secret minimum 32 characters enforced at startup
- **Authorization:**
  - Role-based: `user`, `volunteer`, `volunteer_manager`, **`operator`**, `admin`, `org_admin`, `super_admin` (plus organization-scoped rules for org-linked volunteers where implemented)
  - `AdminAuthGuard` extends `JwtAuthGuard`, checks roles array for elevated admin operations (`admin` | `org_admin` | `super_admin`); **`volunteer_manager` and `operator` are not admin roles** unless explicitly added to product policy
  - **`OperatorAuthGuard`** (required — not yet implemented): a new guard that extends `JwtAuthGuard` and checks for `operator` | `admin` | `super_admin` in `user.roles`. SHALL protect all `/api/operator/*` endpoints. See §10.1.
  - `OptionalAuthGuard` allows unauthenticated access while enriching authenticated requests
  - Admin access is role-based only — no hardcoded email checks (SEC-003.1)
  - Only `ROOT_ADMIN_EMAIL` is hardcoded for initial bootstrap
- **Anonymity enforcement:**
  - Posts with `anonymity_level < 4` SHALL have author identity fields stripped from API responses for unauthorized viewers (server-side — never rely on client-side redaction alone).
  - Operator endpoints SHALL enforce that only users with `operator` role can access requester PII in the matching context.
  - Match candidates SHALL NOT see requester identity until mutual acceptance (§2.14.4).
- **HTTP security headers (via `helmet`):**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - HSTS enabled
  - XSS filter enabled
  - Referrer-Policy configured
  - CSP disabled (for OAuth compatibility)
  - COOP: `same-origin-allow-popups` (for Google OAuth popups)
  - COEP: `unsafe-none` (for OAuth)
- **Validation:**
  - Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
  - Error messages disabled in production (`disableErrorMessages: true`)
  - Class-validator decorators on DTOs
- **Password hashing:** `argon2` (not bcrypt)
- **CORS:** Configurable via `CORS_ORIGIN` env var, comma-separated origins
- **Environment cross-check:** `main.ts` validates database/Redis URLs don't mix dev/prod

### 3.3 Scalability

- **Stateless API:** JWT-based auth allows horizontal scaling
- **Redis:** Used for caching (stats), sessions, token blacklist, rate limiting — can be scaled independently
- **PostgreSQL connection pooling:** Max 20 connections per instance
- **Monorepo structure:** Supports independent deployment of API and mobile
- **Railway deployment:** Docker-based with restart on failure (max 10 retries), health checks

### 3.4 Reliability

- **Health checks:** `/health` and `/health/redis` endpoints
- **Railway health check:** `healthcheckPath: "/health"`, timeout 300s
- **Graceful shutdown:** SIGTERM/SIGINT handlers with logging
- **Unhandled rejection/exception:** Logged and process exits with code 1
- **Redis optional:** Application functions without Redis (returns null/defaults)
- **Database init:** Schema runs on startup via `DatabaseInit`, idempotent (CREATE IF NOT EXISTS, DO blocks)
- **Pre-push hook:** Quality gate with ESLint, tests, optional Sonar check

### 3.5 Privacy, Audit Logging, and Access Control (NEW)

- **Audit logging for operator actions:**
  - Every read, create, update, and status-transition action on matching cases and queue items SHALL be recorded in the `matching_case_audit` table (§6.1.13).
  - Audit records include: `actor_id` (operator/admin), `action` (enum: `view_queue`, `claim_item`, `create_case`, `propose_candidate`, `update_status`, `add_note`, `view_requester_pii`), `timestamp`, `case_id` (nullable for queue-level actions), and `details` JSONB.
  - Audit logs SHALL be immutable (INSERT only, no UPDATE/DELETE by application code). Retention: minimum 2 years or per legal requirements.
- **PII access logging:**
  - Accessing author identity for a Level 1/2/3 post through operator endpoints SHALL generate an audit record with action `view_requester_pii`. This enables compliance review of who accessed what personal data and when.
- **Data minimization:**
  - API responses for non-operator users SHALL omit fields that the requesting user is not authorized to see (server-side projection, not client-side filtering).
  - Match candidate notifications SHALL contain the minimum information needed to evaluate the match (category, approximate location, need description — no requester name/contact).
- **Access control summary:**

  | Resource | `user` | `volunteer` | `operator` | `admin` | `super_admin` |
  |----------|--------|-------------|------------|---------|---------------|
  | Public feed (Level 4 posts) | Read | Read | Read | Read+Mod | Full |
  | Level 3 posts (redacted) | Read (redacted) | Read (redacted) | Read (full) | Read+Mod (full) | Full |
  | Level 2 posts | Hidden (unless follower → redacted) | Hidden (unless follower → redacted) | Read (full) | Read+Mod (full) | Full |
  | Level 1 posts | Hidden | Hidden | Read (full) | Read+Mod (full) | Full |
  | Operator queue | Forbidden | Forbidden | Read+Claim | Read+Claim | Full |
  | Match cases | Forbidden | Forbidden | CRUD (own) | CRUD (all) | Full |
  | Audit logs | Forbidden | Forbidden | Read (own cases) | Read (all) | Full |

---

## 4. Frontend Architecture

### 4.1 Framework and Libraries

- **Framework:** React Native with Expo SDK
- **Web support:** Expo for Web (metro bundler)
- **Navigation:** `@react-navigation/native` + `@react-navigation/stack` + `@react-navigation/bottom-tabs`
  - Expo Router exists but is **deprecated** (returns null) — kept to avoid import errors
- **State management:** Zustand (3 stores)
- **HTTP client:** Axios (via `apiService`)
- **Auth:** Firebase Auth + Google OAuth (`expo-auth-session`)
- **Animations:** `react-native-reanimated`, `@shopify/react-native-skia`
- **Charts:** `react-native-chart-kit`
- **i18n:** `i18next` + `react-i18next` (Hebrew default, English fallback)
- **Storage:** `@react-native-async-storage/async-storage`, `expo-secure-store`
- **Other:** `expo-notifications`, `expo-image-picker`, `expo-location`, `expo-haptics`, `expo-document-picker`, `expo-file-system`

### 4.2 Component Structure

```
apps/mobile/
├── App.tsx                          # Root shell (ErrorBoundary, Navigation, StatusBar)
├── app/                             # Expo Router (deprecated, returns null)
│   ├── _layout.tsx
│   ├── i18n.ts                      # i18next initialization
│   └── oauthredirect.tsx            # OAuth callback handler
├── navigations/                     # React Navigation configuration
│   ├── MainNavigator.tsx            # Root stack (auth/unauth routing)
│   ├── BottomNavigator.tsx          # Tab bar (Home, Search, Donations, Profile, Admin)
│   ├── HomeTabStack.tsx             # Home tab nested screens
│   ├── SearchTabStack.tsx           # Search tab nested screens
│   ├── ProfileTabStack.tsx          # Profile tab nested screens
│   ├── DonationsStack.tsx           # Donations tab (30+ category screens + Shiduchim Tov)
│   ├── AdminStack.tsx               # Admin tab nested screens
│   └── TopBarNavigator.tsx          # Shared top bar (settings, notifications, chat)
├── screens/                         # 63+ screen components
├── donationScreens/                 # 33+ donation category screens
├── bottomBarScreens/                # Tab bar root screens
├── topBarScreens/                   # Shared top bar screens
├── components/                      # 73+ reusable UI components
├── stores/                          # Zustand stores
├── context/                         # React Context (legacy, parallel to stores)
├── hooks/                           # Custom React hooks
├── globals/                         # Design tokens, constants, types
├── locales/                         # i18n translations (en/ + he/)
├── google_auth/                     # Google OAuth implementation
├── src/                             # Services and infrastructure
│   ├── api/api.service.ts           # Central API client
│   ├── services/                    # Domain services
│   ├── infrastructure/              # Config, database, storage
│   └── utils/                       # Helpers and validators
└── utils/                           # Adapters, Firebase client, linking config
```

### 4.3 State Management

**Zustand stores (primary):**

| Store | File | Responsibilities |
|-------|------|------------------|
| `userStore` | `stores/userStore.ts` | User session, authentication state, guest mode, Firebase auth listener, JWT storage (AsyncStorage), role management, `resetHomeScreen` |
| `webModeStore` | `stores/webModeStore.ts` | Web `site` vs `app` mode toggle, persisted to `localStorage` (key: `kc_web_mode`) |
| `appLoadingStore` | `stores/appLoadingStore.ts` | Feature-level loading states, errors, `markAppReady` |

**Legacy Context providers (parallel to stores, not actively wrapped in App.tsx):**
- `WebModeContext` — same semantics as `webModeStore`
- `AppLoadingContext` — reducer-based loading (parallel to `appLoadingStore`)

### 4.4 Routing / Navigation

**Authentication-based routing:**

```
MainNavigator (Stack)
├── Authenticated / Guest Mode:
│   ├── HomeStack → BottomNavigator (Tabs)
│   │   ├── HomeScreen (HomeTabStack)
│   │   │   ├── HomeMain (Feed)
│   │   │   ├── CommunityStatsScreen
│   │   │   ├── PostsReelsScreen (transparent modal)
│   │   │   └── ... shared screens
│   │   ├── SearchScreen (SearchTabStack)
│   │   ├── DonationsScreen (DonationsStack)
│   │   │   ├── MoneyScreen, ItemsScreen, TimeScreen, KnowledgeScreen
│   │   │   ├── 30+ category screens (Food, Clothes, Books, etc.)
│   │   │   ├── MatchmakingScreen (existing — romantic/singles, see §2.3.3)
│   │   │   ├── ShiduchimTovScreen (NEW — Good Matching entry, see §2.15)
│   │   │   │   ├── [non-operator] ExplainerView
│   │   │   │   └── [operator] OperatorWorkspace
│   │   │   │       ├── OperatorQueueScreen
│   │   │   │       ├── OperatorCaseDetailScreen
│   │   │   │       ├── OperatorCaseListScreen
│   │   │   │       └── OperatorAuditScreen
│   │   │   ├── CommunityChallengesScreen
│   │   │   ├── ChallengeDetailsScreen, ChallengeStatisticsScreen
│   │   │   └── MyChallengesScreen, MyCreatedChallengesScreen
│   │   ├── ProfileScreen (ProfileTabStack) [hidden in guest mode]
│   │   └── AdminDashboard (AdminStack) [admin only]
│   │       ├── AdminMoney, AdminPeople, AdminReview
│   │       ├── AdminTasks, AdminCRM, AdminFiles
│   │       ├── AdminTables, AdminTableRows
│   │       └── AdminTimeManagement
│   ├── NewChatScreen, ChatDetailScreen
│   ├── BookmarksScreen, FollowersScreen, DiscoverPeopleScreen
│   ├── UserProfileScreen, EditProfileScreen, SettingsScreen
│   ├── NotificationsScreen, WebViewScreen
│   └── AboutKarmaCommunityScreen
└── Unauthenticated:
    ├── LandingSiteScreen (web + site mode only)
    ├── LoginScreen
    └── OrgOnboardingScreen
```

**New screens required for Shiduchim Tov / Operator Matching (§2.15):**

| Screen | File (proposed) | Guard | Description |
|--------|-----------------|-------|-------------|
| `ShiduchimTovScreen` | `donationScreens/ShiduchimTovScreen.tsx` | Auth required | Entry point — renders ExplainerView or OperatorWorkspace based on `roles` |
| `OperatorQueueScreen` | `screens/operator/OperatorQueueScreen.tsx` | `operator` role | Matching queue list with filters and claim action |
| `OperatorCaseDetailScreen` | `screens/operator/OperatorCaseDetailScreen.tsx` | `operator` role | Case detail with candidate search and propose-match flow |
| `OperatorCaseListScreen` | `screens/operator/OperatorCaseListScreen.tsx` | `operator` role | Operator's assigned cases dashboard |
| `OperatorAuditScreen` | `screens/operator/OperatorAuditScreen.tsx` | `operator` role | Read-only audit log for a case |

**Post creation enhancement:** The existing post-creation flow (verify location in codebase — likely in `PostsReelsScreen` or a modal) SHALL be extended with an `anonymity_level` selector (§2.5.7). This is a UI-only addition (dropdown/segmented control) that maps to the new DTO field.

### 4.5 UI Patterns and Reusable Components

**Design system (`globals/`):**
- `colors.tsx` — semantic color tokens (primary, backgrounds, text, navigation, status)
- `constants.tsx` — `IconSizes`, `FontSizes`, `filterOptions`, `sortOptions`, `LAYOUT_CONSTANTS`
- `responsive.ts` — `vw`, `vh`, `scaleSize`, RTL helpers (`rowDirection`, `biDiTextAlign`)
- `styles.tsx` — shared `StyleSheet` styles

**Key reusable components (73+ total):**
- **Feed:** `PostCard` variants (DonationItem, ItemDelivered, RideOffered, RideCompleted, TaskAssignment, TaskCompletion, Regular), `FeedHeader`, `PostReelItem`, `CommentsModal`, `EditPostModal`, `OptionsModal`, `QuickMessageModal`, `ReportPostModal`
- **Challenges:** `DailyHabitsQuickView`, `EditChallengeModal`, `EditEntryModal`, `HabitsStatsCard`, `HabitsTrackerTable`, `HabitsTrackerCell`, `ViewToggleButtons`
- **Chat:** `ChatListItem`, `ChatMessageBubble`
- **Forms/Input:** `SearchBar`, `FilterSortOptions`, `DatePicker`, `TimePicker`, `TimeInput`, `LocationSearchComp`, `AutocompleteDropdownComp`, `UserSelector`, `LanguageSelector`
- **Profile:** `ProfileOpenTab`, `ProfileClosedTab`, `ProfileTaggedTab`, `ProfileCompletionBanner`, `AdminHierarchyTree`
- **Stats:** `CommunityStatsGrid`, `CommunityStatsPanel`, `StatDetailsModal`, `StatMiniCharts`, `DonationStatsFooter`, `DonationStatsScreen`
- **Auth:** `EmailLoginForm`, `FirebaseGoogleButton`, `OrganizationLoginForm`, `LoginSidePanel`, `GuestModeNotice`
- **Layout:** `ScreenWrapper`, `ScrollContainer`, `HeaderComp`, `MenuComp`, `Toast`, `ErrorBoundary`
- **Visual:** `FloatingBubblesOverlay`, `FloatingBubblesSkia`, `VerticalGridSlider`, `DevEnvironmentBanner`, `WebModeToggleOverlay`
- **Operator (NEW — required):** `OperatorQueueItem`, `CaseStatusTimeline`, `CandidateCard`, `MatchProposalModal`, `AnonymityLevelSelector` (reusable in post creation), `OperatorNoteEditor`

### 4.6 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useFeedData` | Feed data loading and pagination (SHOULD incorporate filter/sort state per §2.5.6 and anonymity-aware filtering per §2.5.7) |
| `usePostDeletion` | Post deletion with confirmation |
| `usePostInteractions` | Like, comment, share interactions |
| `usePostMenu` | Post context menu options |
| `useProfileNavigation` | Navigate to user profiles |
| `useAdminProtection` | Admin route guard |
| `useOperatorProtection` | **NEW (required):** Operator route guard — checks `roles.includes('operator')` and redirects to explainer if not authorized |
| `useUnreadNotificationsCount` | Notification badge count |
| `useScrollPosition` | Scroll position tracking |

### 4.7 Internationalization

- **Engine:** i18next with `react-i18next` bindings
- **Default language:** Hebrew (`he`)
- **Fallback language:** English (`en`)
- **27+ namespaces:** `common`, `home`, `profile`, `donations`, `donationResources`, `discover`, `notifications`, `auth`, `errors`, `buttons`, `labels`, `settings`, `comments`, `search`, `bookmarks`, `trump`, `chat`, `landing`, `quickMessage`, `challenges`, `admin`, `errorBoundary`, `dropdown`, `items`, `newChatScreen`, `rides`, `webOverlay`, **`operator`** (NEW — required for Shiduchim Tov / operator workspace strings)
- **RTL support:** Full RTL via responsive helpers, `I18nManager`, and `biDiTextAlign`
- **Persistence:** Language stored in AsyncStorage (`app_language`)

---

## 5. Backend Architecture

### 5.1 API Structure

**Framework:** NestJS (modular architecture)  
**Entry point:** `src/main.ts` → `AppModule`  
**Port:** 3001 (configurable via `PORT`)

**Module hierarchy:**

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (60 req/60s)
├── DatabaseModule (global, PG_POOL)
├── RedisModule (global, REDIS)
├── RedisCacheModule
├── AuthModule
│   ├── JwtService
│   ├── SessionService
│   ├── RateLimitService
│   ├── FirebaseAdminService
│   ├── AuthController
│   └── SessionController
├── UsersModule
│   ├── UserAuthService, UserProfileService
│   ├── UserFollowService, UserStatsService
│   ├── UserHierarchyService, UserResolutionService
│   └── 5 Controllers (auth, profile, hierarchy, stats, follow)
├── PostsModule
│   ├── PostsService, PostsLikesService, PostsCommentsService
│   ├── PostsSchemaService
│   └── PostsController
├── ItemsModule
│   ├── ItemsService, DedicatedItemsService, ItemsDeliveryService
│   └── 3 Controllers
├── DonationsModule → DonationsController
├── RidesModule → RidesController
├── StatsModule
│   ├── StatsQueriesService, StatsMapperService
│   ├── ComputedStatsService, StatsFacadeService
│   └── StatsController
├── AdminModule
│   ├── AdminTablesService, TasksService
│   └── 5 Controllers (tables, files, CRM, tasks, community-members)
├── ChallengesModule
│   └── 2 Controllers (personal, community group)
├── ChatModule → ChatController
├── NotificationsModule → NotificationsController
├── OperatorMatchingModule (NEW — required, see §2.14)
│   ├── OperatorQueueService
│   ├── MatchingCaseService
│   ├── MatchingCandidateService
│   ├── OperatorAuditService
│   ├── OperatorAuthGuard
│   └── OperatorController (prefix: /api/operator)
├── SyncModule → SyncController
└── SharedModule
    └── 4 Controllers (health, places, rate-limit, redis-test)
```

**Note on OperatorMatchingModule:** This module does **not** exist in the current codebase (`apps/api/src/modules/`). It is listed here as a **required addition**. See §10.1 for implementation status.

### 5.2 Services and Business Logic

**Data access pattern:** Direct SQL via `pg.Pool` (injected as `PG_POOL`), no ORM.

| Layer | Pattern |
|-------|---------|
| Controllers | HTTP routing, request validation, response formatting |
| Services | Business logic, SQL queries, Redis caching |
| Guards | Authentication (`JwtAuthGuard`, `AdminAuthGuard`, `OptionalAuthGuard`, **`OperatorAuthGuard`** — required) |
| DTOs | Input validation via `class-validator` decorators |

**Notable pattern:** Donations and Rides controllers contain business logic directly (no separate service files).

**New DTOs required for operator matching:**
- `CreateMatchCaseDto`: `post_id` (UUID, required), `priority` (optional enum), `notes` (optional string)
- `ProposeMatchCandidateDto`: `candidate_user_id` (UUID, required), `candidate_type` (enum: volunteer | donor), `match_reason` (string, required)
- `UpdateCaseStatusDto`: `status` (enum), `notes` (optional)
- `UpdatePostAnonymityDto`: `anonymity_level` (integer 1–4, required)

### 5.3 Middleware

| Middleware | Type | Purpose |
|------------|------|---------|
| `body-parser` | Express | JSON/URL-encoded parsing (5MB limit) |
| `helmet` | Express | Security headers |
| CORS | Express | Cross-origin configuration |
| COOP/COEP | Custom Express | OAuth popup compatibility |
| `ValidationPipe` | NestJS Global | Request validation |
| `ThrottlerGuard` | NestJS | Rate limiting per controller |

### 5.4 Authentication & Authorization Flow

```
Client Request
    │
    ▼
Extract token from:
  - Authorization: Bearer <token>
  - X-Auth-Token: <token>
    │
    ▼
Rate limit check (100 req/60s per token prefix)
    │
    ▼
Try JWT verification (HMAC-SHA256)
    │
    ├─ Success → Check blacklist → Check expiry → Attach user to request
    │
    └─ Failure → Try Firebase ID token verification
                     │
                     ├─ Success → Lookup user by firebase_uid → Create payload → Attach
                     │
                     └─ Failure → 401 Unauthorized
    │
    ▼
(If AdminAuthGuard) Check roles include one of: admin, org_admin, super_admin (volunteer_manager and operator are not treated as admin unless policy changes)
    │
    ▼
(If OperatorAuthGuard — NEW) Check roles include one of: operator, admin, super_admin
    │
    ▼
Controller handler executes
```

---

## 6. Database Design

### 6.1 Primary Schema (`schema.sql`)

**Extensions:** `uuid-ossp` (UUID generation), `pg_trgm` (trigram text search)

#### 6.1.1 User & Auth

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `user_profiles` | `id` UUID | `firebase_uid`, `google_id`, `email`, `name`, `phone`, `avatar_url`, `bio`, `karma_points` INT, `city`, `country`, `interests` TEXT[], `roles` TEXT[] default `{user}` (SHALL support `volunteer_manager`, `operator`, and org-scoped semantics per §2.2.5 and §2.14), `password_hash`, `email_verified` BOOL, `settings` JSONB (SHALL support profile UI preferences per §2.2.6), `parent_manager_id` UUID, `salary` NUMERIC, `seniority_start_date` DATE, `posts_count`, `followers_count`, `following_count`, `total_donations_amount`, `total_volunteer_hours` | UNIQUE(`email`), UNIQUE(`firebase_uid`), UNIQUE(`google_id`), FK `parent_manager_id` → self; **optional `organization_id` → `organizations`** — required by §2.2.5 for org-affiliated volunteers if not already present — אין מספיק מידע בקוד כדי לקבוע current column |
| `user_follows` | `id` UUID | `follower_id`, `following_id`, `created_at` | UNIQUE(`follower_id`, `following_id`) |
| `user_activities` | `id` UUID | `user_id`, `activity_type`, `description`, `metadata` JSONB, `created_at` | — |
| `user_notifications` | `id` UUID | `user_id`, `type`, `title`, `message`, `data` JSONB, `is_read` BOOL, `created_at` | — |

#### 6.1.2 Organizations

| Table | Primary Key | Key Columns |
|-------|------------|-------------|
| `organizations` | `id` UUID | `name`, `description`, `logo_url`, `website`, `contact_email`, `phone`, `address`, `city`, `country`, `type`, `status` default `pending`, `created_by` UUID |
| `organization_applications` | `id` UUID | `user_id`, `organization_id`, `status` default `pending`, `message`, `reviewed_by` |

#### 6.1.3 Donations

| Table | Primary Key | Key Columns |
|-------|------------|-------------|
| `donation_categories` | `id` UUID | `name`, `slug` (UNIQUE), `description`, `icon`, `color` |
| `donations` | `id` UUID | `donor_id`, `recipient_id`, `organization_id`, `category_id`, `type`, `title`, `description`, `amount` NUMERIC, `quantity` INT, `status` default `available`, `city`, `country`, `location`, `images` TEXT[], `tags` TEXT[], `metadata` JSONB |

#### 6.1.4 Rides

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `rides` | `id` UUID | `driver_id`, `origin`, `destination`, `origin_city`, `destination_city`, `departure_time` TIMESTAMP, `available_seats` INT, `price` NUMERIC, `description`, `status` default `active`, `vehicle_info`, `preferences`, `route_details` JSONB | — |
| `ride_bookings` | `id` UUID | `ride_id`, `passenger_id`, `seats_booked` INT default 1, `status` default `pending`, `message` | UNIQUE(`ride_id`, `passenger_id`) |

#### 6.1.5 Events

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `community_events` | `id` UUID | `organizer_id`, `organization_id`, `title`, `description`, `event_type`, `start_date`, `end_date`, `location`, `city`, `max_attendees`, `current_attendees` default 0, `status` default `upcoming`, `tags` TEXT[], `images` TEXT[] | — |
| `event_attendees` | `id` UUID | `event_id`, `user_id`, `status` default `registered` | UNIQUE(`event_id`, `user_id`) |

#### 6.1.6 Chat

| Table | Primary Key | Key Columns | Constraints |
|-------|------------|-------------|-------------|
| `chat_conversations` | `id` UUID | `participants` UUID[], `type` default `direct`, `name`, `last_message_at`, `metadata` JSONB | GIN index on `participants` |
| `chat_messages` | `id` UUID | `conversation_id` UUID NOT NULL, `sender_id`, `content`, `type` default `text`, `metadata` JSONB, `is_edited` BOOL, `edited_at` | — |
| `message_read_receipts` | `id` UUID | `message_id`, `user_id`, `read_at` | UNIQUE(`message_id`, `user_id`) |

#### 6.1.7 Statistics

| Table | Primary Key | Key Columns | Constraints |
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

## 7. Data Flow

### 7.1 Authentication Flow

```
Mobile/Web Client                    API Server                    External
      │                                 │                            │
      │  1. User enters credentials     │                            │
      │  ───────────────────────────►   │                            │
      │  POST /auth/login               │                            │
      │                                 │  2. Verify password        │
      │                                 │  (argon2.verify)           │
      │                                 │                            │
      │                                 │  3. Create JWT pair        │
      │                                 │  ──► Redis: store          │
      │                                 │      refresh token         │
      │  4. Return tokens + user        │                            │
      │  ◄───────────────────────────   │                            │
      │                                 │                            │
      │  5. Store JWT in AsyncStorage   │                            │
      │                                 │                            │
      │ -- OR for Google OAuth --       │                            │
      │                                 │                            │
      │  1. Google Sign-In popup        │                            │
      │  ──────────────────────────────────────────────────────►    │
      │                                 │              Google OAuth  │
      │  2. ID Token returned           │                            │
      │  ◄──────────────────────────────────────────────────────    │
      │                                 │                            │
      │  3. POST /auth/google           │                            │
      │  ───────────────────────────►   │                            │
      │                                 │  4. Verify Google token    │
      │                                 │  (google-auth-library)     │
      │                                 │  5. Find/create user       │
      │                                 │  6. Create JWT pair        │
      │  7. Return tokens + user        │                            │
      │  ◄───────────────────────────   │                            │
```

### 7.2 Authenticated Request Flow

```
Mobile/Web Client                    API Server                    PostgreSQL / Redis
      │                                 │                            │
      │  1. Request with Bearer token   │                            │
      │  ───────────────────────────►   │                            │
      │                                 │                            │
      │                                 │  2. JwtAuthGuard:          │
      │                                 │     a. Extract token       │
      │                                 │     b. Rate limit check    │
      │                                 │     ──► Redis              │
      │                                 │     c. Verify JWT sig      │
      │                                 │     d. Check blacklist     │
      │                                 │     ──► Redis              │
      │                                 │     e. Check expiry        │
      │                                 │     f. Attach user to req  │
      │                                 │                            │
      │                                 │  3. Controller handler     │
      │                                 │     ──► SQL query          │
      │                                 │     ──────────────────►    │
      │                                 │     ◄──────────────────    │
      │                                 │                            │
      │  4. ApiResponse<T>              │                            │
      │  ◄───────────────────────────   │                            │
```

### 7.3 Post Feed Flow

```
Mobile Client                        API Server                    PostgreSQL
      │                                 │                            │
      │  GET /api/posts?page=1&limit=20 │                            │
      │  ───────────────────────────►   │                            │
      │                                 │  PostsService.getPosts()   │
      │                                 │  SQL: SELECT p.*, u.name   │
      │                                 │  FROM posts p               │
      │                                 │  JOIN user_profiles u       │
      │                                 │  ORDER BY created_at DESC  │
      │                                 │  LIMIT 20 OFFSET 0        │
      │                                 │  ──────────────────────►   │
      │                                 │  ◄──────────────────────   │
      │                                 │                            │
      │  ApiResponse<Post[]>            │                            │
      │  (with pagination metadata)     │                            │
      │  ◄───────────────────────────   │                            │
      │                                 │                            │
      │  Like: POST /api/posts/:id/like │                            │
      │  ───────────────────────────►   │                            │
      │                                 │  Toggle in post_likes      │
      │                                 │  Trigger updates count     │
      │  LikeResponse                   │                            │
      │  ◄───────────────────────────   │                            │
```

### 7.4 Statistics Caching Flow

```
Client                              API Server                    Redis         PostgreSQL
   │                                   │                            │               │
   │  GET /api/stats/community         │                            │               │
   │  ────────────────────────────►    │                            │               │
   │                                   │  1. Check Redis cache      │               │
   │                                   │  ─────────────────────►    │               │
   │                                   │                            │               │
   │                                   │  Cache HIT: return cached  │               │
   │  ◄────────────────────────────    │  ◄─────────────────────    │               │
   │                                   │                            │               │
   │  -- OR Cache MISS --              │                            │               │
   │                                   │  2. SQL aggregate queries  │               │
   │                                   │  ──────────────────────────────────────►   │
   │                                   │  ◄──────────────────────────────────────   │
   │                                   │  3. Map + compute          │               │
   │                                   │  4. Store in Redis (TTL)   │               │
   │                                   │  ─────────────────────►    │               │
   │  5. Return stats                  │                            │               │
   │  ◄────────────────────────────    │                            │               │
```

### 7.5 High-Anonymity Post → Operator Matching Flow (NEW)

```
Author (Mobile)          API Server               PostgreSQL          Operator (Mobile)
   │                        │                        │                     │
   │  1. Create post        │                        │                     │
   │  POST /api/posts       │                        │                     │
   │  { anonymity_level: 1, │                        │                     │
   │    title, description } │                        │                     │
   │  ─────────────────►    │                        │                     │
   │                        │  2. INSERT into posts   │                     │
   │                        │  (anonymity_level=1)   │                     │
   │                        │  ──────────────────►   │                     │
   │                        │  ◄──────────────────   │                     │
   │                        │                        │                     │
   │                        │  3. INSERT into         │                     │
   │                        │  matching_cases         │                     │
   │                        │  (status='unassigned')  │                     │
   │                        │  ──────────────────►   │                     │
   │                        │  ◄──────────────────   │                     │
   │                        │                        │                     │
   │                        │  4. Notify operators   │                     │
   │                        │  INSERT notification    │                     │
   │                        │  (type='operator_new    │                     │
   │                        │   _queue_item')        │                     │
   │                        │  ──────────────────►   │                     │
   │  5. Post created ack   │                        │                     │
   │  ◄─────────────────    │                        │                     │
   │                        │                        │                     │
   │                        │                        │  6. Operator polls  │
   │                        │                        │  notifications      │
   │                        │                        │  ◄─────────────────│
   │                        │                        │                     │
   │                        │                        │  7. GET /api/       │
   │                        │                        │  operator/queue     │
   │                        │  ◄──────────────────────────────────────────│
   │                        │  8. Return queue items │                     │
   │                        │  (full author identity) │                     │
   │                        │  ──────────────────────────────────────────►│
   │                        │                        │                     │
   │                        │                        │  9. Operator claims │
   │                        │                        │  PUT case status    │
   │                        │  ◄──────────────────────────────────────────│
   │                        │  10. UPDATE matching_  │                     │
   │                        │  cases SET status=     │                     │
   │                        │  'assigned', operator  │                     │
   │                        │  ──────────────────►   │                     │
   │                        │                        │                     │
   │                        │                        │  11. Operator       │
   │                        │                        │  proposes candidate │
   │                        │  ◄──────────────────────────────────────────│
   │                        │  12. INSERT into       │                     │
   │                        │  matching_candidates   │                     │
   │                        │  ──────────────────►   │                     │
   │                        │                        │                     │
   │                        │  13. Notify candidate  │                     │
   │                        │  + requester           │                     │
   │                        │  (scoped, anonymised)  │                     │
   │                        │  ──────────────────►   │                     │
   │  14. Author sees       │                        │                     │
   │  "match proposed"      │                        │                     │
   │  notification          │                        │                     │
   │  ◄─────────────────    │                        │                     │
   │                        │                        │                     │
   │  ... mutual acceptance / decline flow ...       │                     │
   │                        │                        │                     │
   │  15. On mutual accept: │                        │                     │
   │  both parties revealed │                        │                     │
   │  + optional chat       │                        │                     │
   │  created               │                        │                     │
```

---

## 8. External Integrations

### 8.1 Firebase

| Component | Usage | Configuration |
|-----------|-------|---------------|
| **Firebase Auth (client)** | User authentication (email, Google) on mobile/web | `EXPO_PUBLIC_FIREBASE_*` keys in mobile `.env` |
| **Firebase Admin SDK (server)** | ID token verification, user sync | `FIREBASE_SERVICE_ACCOUNT` (base64) or `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON) |
| **Firestore (client)** | Optional data adapter (currently disabled: `USE_FIRESTORE=false`) | Persistent local cache enabled for offline |
| **Firebase Storage (client)** | File uploads (chat files, user images, donation images, admin files) | Via `storage.service.ts` with path builders |

### 8.2 Google APIs

| API | Usage | Configuration |
|-----|-------|---------------|
| **Google OAuth 2.0** | User authentication via Google Sign-In | `GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| **Google Places API** | Location autocomplete and place details | `GOOGLE_API_KEY` |
| **google-auth-library (server)** | Server-side Google token verification | `GOOGLE_CLIENT_ID` |

### 8.3 SonarCloud

| Component | Usage | Configuration |
|-----------|-------|---------------|
| **SonarCloud** | Static code analysis in CI pipeline | `SONAR_TOKEN` (CI secret), project config in workflow YAML |

### 8.4 Snyk

| Component | Usage | Configuration |
|-----------|-------|---------------|
| **Snyk** | Dependency vulnerability scanning in CI | `SNYK_TOKEN` (optional) |

### 8.4.1 User Identity SSoT (Single Source of Truth)

> **Authoritative contract** for the canonical user identifier across the system.

#### Canonical id

- The **only** canonical user identifier is `user_profiles.id` (UUID, generated server-side).
- Firebase UID, Google `sub`, and email are **mapping inputs** consumed by `UserResolutionService`. They MUST NOT be used as the actor identifier in client state, JWTs, or ownership checks without first being resolved to `user_profiles.id`.

#### JWT contract

- All JWTs minted by the API embed the canonical UUID in the `userId` claim (the project's equivalent of `sub`).
- `JwtService.createTokenPair` enforces this at runtime: an attempt to mint a token whose `id` is not a canonical `user_profiles.id` UUID is rejected with an error and an audit log entry. See `apps/api/src/auth/jwt.service.ts` (`isCanonicalUserProfileUuid`).
- `JwtAuthGuard` falls back to Firebase ID token verification only as a **legacy compatibility path**. Even on that path, the request's `request.user.userId` is set to the resolved `user_profiles.id` from the database, never to `firebase_uid`.
- Tokens minted before this contract that still carry a Firebase UID `userId` continue to be accepted until they expire (1h access / 30d refresh). All **new** logins issue UUID-bound tokens.

#### API style

- For authenticated routes, prefer deriving the actor user id from `request.user.userId` (already canonical UUID).
- Where a `user_id` query parameter is unavoidable for legacy compatibility (e.g. the community challenges read endpoints), the controller MUST resolve the value through `UserResolutionService.resolveUserId` before comparing it to a UUID column. See:
  - `apps/api/src/controllers/community-group-challenges.controller.ts` — uses the controller-private `resolveUserIdOrThrow` helper for all `@Query("user_id")` parameters.
  - `apps/api/src/controllers/tasks.controller.ts`, `chat.controller.ts`, `community-members.controller.ts` — already resolve via `UserResolutionService`.

#### Resolve endpoint

- `POST /api/users/resolve-id` is the **mapping endpoint**. Inputs: `firebase_uid` and/or `email`. Output: the canonical `user_profiles.id` plus a JWT token pair bound to the UUID. This endpoint is the only path that should resolve external identifiers from the client.

#### Client SSoT projection (mobile)

- A single module — `apps/mobile/session/AuthSessionService.ts` — owns:
  - `establishSession(payload)` — canonicalizes `payload.user.id`, persists tokens + minimal user snapshot atomically, emits state.
  - `restoreSession()` — loads persisted session; if the persisted id is not canonical, attempts ONE server-side resolution; **hard fails** the session (clears all artifacts) on failure rather than silent partial auth.
  - `clearSession()` — single deterministic teardown of all auth-related AsyncStorage keys.
- Branded type `UserProfileId` and `isCanonicalUserProfileUuid()` (see `apps/mobile/session/userProfileId.ts`) gate the boundary of `establishSession`.
- `userStore` (Zustand) is a **thin projection** that delegates all canonicalization to `AuthSessionService`. The Firebase `onAuthStateChanged` listener no longer re-runs resolve; it only clears the session on Firebase sign-out.

#### Guest / synthetic users

- Local preview users (`guest_*`, `demo_*`) MUST NOT be sent to `/api/users/resolve-id`. `AuthSessionService` short-circuits them.
- Guest mode is in-memory only (no persistence) and is mutually exclusive with `authMode: 'real'`.

### 8.5 Expo Application Services (EAS)

| Component | Usage |
|-----------|-------|
| **EAS Build** | Mobile app builds (iOS/Android) |
| **EAS Update** | Over-the-air updates |
| **Expo Notifications** | Push notification infrastructure |

---

## 9. Configuration & Environment

### 9.1 Environment Variables

#### API (`apps/api/.env.example`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `ENVIRONMENT` | Yes | `production` | Environment identifier |
| `NODE_ENV` | Yes | `production` | Node.js environment |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins |
| `JWT_SECRET` | **Yes** | — | HMAC signing key (min 32 chars) |
| `DATABASE_URL` | **Yes*** | — | PostgreSQL connection string |
| `POSTGRES_HOST` | Alt* | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | Alt* | `5435` | PostgreSQL port |
| `POSTGRES_USER` | Alt* | `kc` | PostgreSQL user |
| `POSTGRES_PASSWORD` | Alt* | — | PostgreSQL password |
| `POSTGRES_DB` | Alt* | `kc_db` | PostgreSQL database |
| `PG_SSL` / `POSTGRES_SSL` / `PGSSLMODE` | No | — | SSL configuration |
| `REDIS_URL` | **Yes*** | — | Redis connection string |
| `REDIS_HOST` / `REDIS_PORT` | Alt* | — | Redis host/port |
| `REDIS_TLS` / `REDIS_SSL` | No | `false` | Redis TLS |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | No | — | Fallback for `GOOGLE_CLIENT_ID` |
| `GOOGLE_API_KEY` | No | — | Google Places API key |
| `FIREBASE_SERVICE_ACCOUNT` | No | — | Base64-encoded service account JSON |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | No | — | JSON string service account |
| `ROOT_ADMIN_EMAIL` | **Yes** | — | Bootstrap super_admin email |
| `FORCE_FULL_SCHEMA` | No | `false` | Force schema rebuild |
| `SKIP_FULL_SCHEMA` | No | `0` | Skip schema init |
| `SNYK_TOKEN` | No | — | Snyk API token for quality gate |
| **`OPERATOR_NOTIFICATION_ENABLED`** | No | `true` | **NEW:** Enable/disable push notifications to operators when new queue items arrive (§2.14.5). Useful for staging environments where operator notifications are not desired. |
| **`OPERATOR_QUEUE_POLL_INTERVAL_MS`** | No | `10000` | **NEW:** Suggested polling interval (ms) returned to operator clients for queue refresh. Server hint only — client enforces actual interval. |

*Either `DATABASE_URL` or individual `POSTGRES_*` vars required. Same for Redis.

#### Mobile (`apps/mobile/.env.example`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXPO_PUBLIC_ENVIRONMENT` | Yes | `development` | Environment |
| `EXPO_PUBLIC_API_BASE_URL` | Yes | `http://localhost:3001` | API URL |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Yes | — | Firebase config |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | — | Firebase Analytics |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Yes | — | Google OAuth (Android) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Yes | — | Google OAuth (Web) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Yes | — | Google OAuth (iOS) |
| `EXPO_PUBLIC_USE_BACKEND` | No | `1` | Use REST backend |
| `EXPO_PUBLIC_USE_FIRESTORE` | No | `0` | Use Firestore directly |
| `EXPO_PUBLIC_ADMIN_EMAILS` | No | — | Comma-separated admin emails |

### 9.2 Deployment

**Platform:** Railway

**API deployment:**
- Docker build (`node:20`)
- `npm ci --include=dev` → `npm run build` (tsc) → `npm prune --production`
- Schema SQL copied to `dist/database/`
- Start: `node dist/main.js`
- Health check: `GET /health` (timeout 300s)
- Restart policy: on failure, max 10 retries

**Mobile web deployment:**
- Docker multi-stage: Expo web export → nginx static serving
- Alternative: `Dockerfile.static` for pre-built static files

**Local development:**
- Docker Compose: PostgreSQL 15 (port 5435), Redis 7 (port 6379)
- API: `npm run dev:api` (NestJS watch mode)
- Mobile: `npm run dev:mobile` (Expo start)

### 9.3 Build Tools and Pipelines

**CI/CD (GitHub Actions):**

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `quality-gate.yml` | Push to `dev`/`main` + PR on `apps/api/**` | ESLint (changed files), tests (`npm run test:ci`), SonarCloud scan, Snyk (optional), quality gate API check |
| `pr-quality-check.yml` | PR on `apps/api/**` | ESLint, tests, SonarCloud, Snyk, PR comment with results |
| `sonar.yml` | Push/PR on `apps/api/**` | Tests + SonarCloud scan |

**Pre-push hook (`.husky/pre-push`):**
- Detects changed files in `apps/api/`
- Runs `check-quality-gate.sh` (ESLint + tests)
- Optional Sonar pre-push check (if `SONAR_TOKEN` set)

**Build toolchain:**
- TypeScript (target ES2019, CommonJS modules)
- ts-jest for testing
- ESLint with shared config (`@kc/config-eslint`)
- Prettier for formatting

---

## 10. Gaps & Assumptions

### 10.1 Missing or Incomplete Features

| Area | Gap | Evidence |
|------|-----|----------|
| **`operator` role** | The `operator` role string does **not** exist anywhere in the API or mobile codebase. `jwt-auth.guard.ts` checks only `admin`, `org_admin`, `super_admin`. The `userStore.ts` `computeRole` does not recognise `operator`. **Required:** add `operator` to role vocabulary, create `OperatorAuthGuard`, update `userStore` role logic, and add mobile navigation guards for operator screens. | Grep for `operator` in `apps/api/src` and `apps/mobile/stores` returned no role-related matches |
| **`anonymity_level` on posts** | The `posts` table DDL (in `posts-schema.service.ts` and `schema.sql`) does **not** include an `anonymity_level` column. No anonymity-aware filtering exists in `PostsService.getPosts()`. **Required:** ALTER TABLE migration to add `anonymity_level SMALLINT DEFAULT 4 CHECK (anonymity_level BETWEEN 1 AND 4)`, update post creation DTO, update feed queries with role/follow-aware filtering. | `posts-schema.service.ts` DDL lines; `posts.service.ts` `getPosts()` |
| **OperatorMatchingModule** | No module, controller, service, or DTO exists under `apps/api/src/modules/` for operator matching. **Required:** full new NestJS module with controller (`/api/operator/*`), services (queue, case, candidate, audit), DTOs, and guard. | Directory listing of `apps/api/src/modules/` |
| **Matching database tables** | `matching_cases`, `matching_candidates`, `matching_case_audit` do **not** exist in `schema.sql` or `database.init.ts`. **Required:** new SQL migration or addition to `DatabaseInit`. | Schema file search |
| **Shiduchim Tov mobile screens** | `ShiduchimTovScreen`, `OperatorQueueScreen`, `OperatorCaseDetailScreen`, `OperatorCaseListScreen`, `OperatorAuditScreen` do **not** exist. `DonationsStack.tsx` does not register them. `DonationsStackParamList` in `globals/types.tsx` does not include them. **Required:** new screen files, navigation registration, type updates, and i18n keys. | `DonationsStack.tsx` imports; `globals/types.tsx` |
| **`shiduchimTov` donation category** | The `BASE_CATEGORIES` array in `DonationsScreen.tsx` does not include a `shiduchimTov` entry. No `donation_categories` row with slug `shiduchim-tov` exists in seed data. **Required:** add category to mobile grid + optional DB seed. | `bottomBarScreens/DonationsScreen.tsx` |
| **Operator notification types** | Notification types `operator_new_queue_item`, `operator_candidate_response`, `operator_case_reassigned` are not defined. **Required:** extend notification type vocabulary and dispatching logic. | `notifications.controller.ts` |
| **Post creation anonymity UI** | No anonymity-level selector exists in the post-creation flow (mobile). **Required:** new `AnonymityLevelSelector` component integrated into post creation modal/screen. | Feed / post creation component search |
| **`useOperatorProtection` hook** | Does not exist. **Required:** similar to `useAdminProtection`, checks for `operator` role. | `hooks/` directory |
| **`operator` i18n namespace** | No `operator.json` in `locales/he/` or `locales/en/`. **Required:** new namespace with all Shiduchim Tov / operator workspace strings. | Locale file listing |
| **Events module** | Database tables exist (`community_events`, `event_attendees`) but **no controller or service** implements CRUD — events are schema-only | No event controller in `src/modules/` |
| **Organizations module** | Tables exist (`organizations`, `organization_applications`) but **no dedicated module** — only `OrgOnboardingScreen` and `AdminOrgApprovalsScreen` on mobile | No organization controller in API |
| **Payment/donation processing** | No payment gateway integration (Stripe, PayPal, etc.) — `donations.amount` is a data field with no transaction processing | No payment SDK in dependencies |
| **Email service** | No email sending capability (no SMTP, SendGrid, etc.) — `sendPasswordReset` and `sendVerification` rely solely on Firebase Auth | No email SDK in API dependencies |
| **File upload (API)** | No `multer` or file upload middleware — admin files endpoint exists but actual upload handling is unclear | No multipart parser in API dependencies |
| **WebSocket/real-time** | No WebSocket or Socket.IO — all "real-time" features use HTTP polling | No `@nestjs/websockets` or `socket.io` in dependencies |
| **Chat persistence (API)** | Chat controller exists but business logic appears lightweight — rich chat features (reactions, voice, typing) exist only in mobile service | Mobile `chat.service.ts` has methods not reflected in API endpoints |
| **Search** | No dedicated search engine (Elasticsearch, etc.) — search is PostgreSQL `LIKE`/trigram only | GIN trigram indexes on items |
| **Testing coverage** | Only 3 test files in API (`health.controller.spec.ts`, `jwt.service.spec.ts`, `jwt-auth.guard.spec.ts`) — most modules untested | `docs/TESTING_PLAN.md` describes aspirational test plan |
| **Mobile testing** | Single test file (`authService.test.ts`) | Jest config exists but minimal tests |
| **API documentation** | No Swagger/OpenAPI — mentioned in `docs/refactoring/FUTURE_PLANS.md` as deferred | No `@nestjs/swagger` in dependencies |
| **Logging (mobile)** | `console.log` used in some places despite `.cursorrules` requiring project logger | Observed in `index.js` and some services |
| **`volunteer_manager` role** | SRS requires role + hierarchy semantics; **code may still only promote to `volunteer`** via `promote-volunteer` — align `roles[]`, guards, and mobile profile UI | Compare `user-hierarchy` / `JwtAuthGuard` / mobile role checks |
| **Org-affiliated volunteer** | Formal `user_profiles.organization_id` (or membership table) may be **missing**; `organizations` / `organization_applications` tables exist without full API | §2.2.5 |
| **Feed filter/sort API** | §2.5.6 requires query params or dedicated feed endpoint; **verify** `GET /api/posts` supports all declared filters/sorts | `posts.controller.ts` / `posts.service.ts` |
| **Profile personalization** | §2.2.6 requires role-based layout; **verify** profile screens branch on `roles` and `settings` | `ProfileScreen` / related components |

### 10.2 Assumptions

| # | Assumption |
|---|------------|
| 1 | The system is in **MVP/active development** phase — many tables exist without corresponding API endpoints (events, organizations) as forward schema provisioning |
| 2 | **Challenges `user_id` is VARCHAR** (not UUID) — assumed to be a separate identity system or legacy format; the mobile app may use string-based user IDs for challenges |
| 3 | **Donations and rides controllers** contain inline SQL without separate service files — assumed intentional for MVP speed, planned for refactoring |
| 4 | **Firebase is transitioning out** — `USE_FIRESTORE=false` default, `USE_BACKEND=true`, and `docs/plans/implementation_plan.md.resolved` describes a Supabase migration plan; current architecture supports both but prefers REST |
| 5 | **Expo Router is deprecated** — returns null; real navigation is React Navigation stack/tab navigators |
| 6 | **Redis is optional** — the app runs without Redis but loses caching, sessions, rate limiting |
| 7 | The admin email allowlist on mobile (`EXPO_PUBLIC_ADMIN_EMAILS`) is a **client-side convenience** — actual admin enforcement is server-side via JWT roles |
| 8 | **`notifications` table** (in migrations) and **`user_notifications`** (in schema) may represent **duplicate/overlapping** notification storage — assumed migration in progress |
| 9 | **Concurrent FKs added via DO blocks** rather than inline — assumed for migration compatibility with existing data |
| 10 | **`volunteer_manager`** is treated as a **first-class role string** in `user_profiles.roles`; promotion and permission matrices may lag until implemented in API and mobile |
| 11 | **`operator`** will be treated as a **first-class role string** in `user_profiles.roles` once implemented. It is NOT an admin role — operators have access only to the matching workspace (§2.14), not to admin endpoints (§2.11). Admins/super_admins have implicit operator access. |
| 12 | **Operator matching is manual (human-in-the-loop)** — no automated ML recommendation is planned for the initial release. Future work may add scoring/suggestions but the SRS treats manual matching as the baseline. |
| 13 | **Shiduchim Tov** is a product-facing name only — the internal module is `operator-matching` and the slug is `shiduchim-tov`. It has no dependency on the existing `matchmaking` category or its data. |

### 10.3 Technical Debt & Risks

| Risk | Severity | Details |
|------|----------|---------|
| **Custom JWT implementation** | Medium | Hand-rolled HMAC-SHA256 JWT instead of battle-tested library (`jsonwebtoken`, `jose`). Functional but increases maintenance burden and attack surface |
| **No global exception filter** | Medium | Unhandled exceptions may leak stack traces in development. Production disables error messages via `ValidationPipe` but no catch-all filter |
| **Inline SQL injection risk** | Low-Medium | Most SQL uses parameterized queries (`$1`, `$2`), but complex queries with `pg-format` and string interpolation require careful review |
| **Dual notification tables** | Low | `user_notifications` and `notifications` may cause confusion; migration to unify needed |
| **No database migration tool** | Medium | Schema changes managed via SQL files and DO blocks — no Prisma/TypeORM/Knex migrations with version tracking. Adding matching tables (§6.1.13) will require careful manual migration. |
| **Client-side admin check** | Low | `EXPO_PUBLIC_ADMIN_EMAILS` on mobile is a convenience; server enforces roles. Risk: UI shows admin features to non-admin if env misconfigured |
| **Console.log in Redis cache service** | Low | `redis-cache.service.ts` uses `console.warn` instead of NestJS Logger — violates project coding standards |
| **Polling-based notifications** | Medium | 5-second polling interval creates unnecessary server load at scale; WebSocket or server-sent events would be more efficient. Operator queue polling adds to this load. |
| **No API versioning** | Medium | All routes under `/api/` with no version prefix — breaking changes affect all clients simultaneously. Adding `/api/operator/*` endpoints is safe but future versioning is recommended. |
| **No rate limiting on all endpoints** | Low | `ThrottlerGuard` only on `AuthController` and `NotificationsController`; other endpoints have per-token rate limiting only through `JwtAuthGuard`. Operator endpoints need their own rate-limit tier (§3.1). |
| **Hebrew in codebase** | Low | README, docs, some Dockerfile comments, and iOS `infoPlist` strings contain Hebrew — violates English-only code comments rule but acceptable in user-facing strings and documentation |
| **No Prisma/ORM** | Info | Listed in `FUTURE_PLANS.md` as deferred. Current raw SQL works but makes schema changes harder to track |
| **Anonymity enforcement complexity** | Medium | Implementing server-side anonymity filtering in `PostsService.getPosts()` requires per-request role checking and follower-set joins, which may degrade feed query performance without proper indexing (add index on `posts.anonymity_level`). |
| **Operator PII access audit** | Medium | Without proper audit logging from day one, it will be difficult to retrospectively demonstrate compliance with privacy requirements. Audit tables (§6.1.13) should be created alongside the matching module. |

### 10.4 Deferred Items (from `docs/refactoring/FUTURE_PLANS.md`)

- Prisma ORM adoption
- Shared packages expansion
- `DatabaseInit` splitting into per-module migrations
- `ConfigService` adoption (replace `process.env` direct access)
- Logger cleanup (eliminate remaining `console.log`)
- Mobile store splits (decompose large stores)
- Swagger/OpenAPI documentation
- API versioning (`/api/v1/`, `/api/v2/`)
- Automated matching suggestions (ML/scoring layer on top of manual operator workflow — future enhancement to §2.14)