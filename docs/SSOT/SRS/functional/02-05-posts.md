> **SRS shard:** `SRS/functional/02-05-posts.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.5 Posts Module (`modules/posts`)

#### 2.5.1 Social Feed

- **Description:** Multi-type post feed with social interactions; **filtering and sorting** are specified in §2.5.6; **anonymity levels** in §2.5.7.
- **Endpoints:**
  - `GET /api/posts` — paginated post feed
  - `GET /api/posts/user/:userId` — user's posts
  - `GET /api/posts/:postId` — single post by id (same joined row shape as list endpoints; optional `viewer_id` for like state)

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
  - **API:** `GET /api/posts` SHALL accept documented query parameters for filter and sort (or a dedicated `GET /api/posts/feed` if preferred). Current implementation may only support pagination — **There is not enough information in the code to determine** full query contract without reading `posts.controller.ts` / service; this section states the **required behavior** for the product.
  - **Client:** Feed header / `FilterSortOptions` (or equivalent) SHALL bind to these parameters and persist last-used preferences in local storage where UX requires.
- **Edge cases:** Combining filters that yield zero results; performance on large datasets (indexes on `posts.created_at`, `post_type`, `author_id`).

#### 2.5.7 Post Anonymity Levels

- **Description:** Each post SHALL have an **anonymity level** (`anonymity_level`) set by the author at creation time and optionally editable before any operator or public interaction has occurred. The level controls **who can see the post content and the author's identity**.

- **Anonymity level definitions:**

  **Level 1 — Operators only ("exposed only to operators")**Description** | Content and all identity details visible **only** to users with the `operator` role. The post does NOT appear in any public feed, follower feed, or search result. It enters the **operator matching queue** (§2.14) for manual triage. |
  | **Who can see what** | **Operators:** full post content, author identity (name, avatar, contact fields), location, category, and any attached metadata. **Followers / authenticated users / guests:** post is completely hidden — excluded from all feed queries and profile post lists. **Admins:** full access for moderation and audit purposes. |
  | **Inputs** | Author selects `anonymity_level = 1` during post creation (or edit, subject to rules below). Author MAY optionally provide additional structured fields for the operator: e.g. urgency, preferred contact method, specific need description stored in `posts.metadata`. |
  | **Outputs** | Post excluded from `GET /api/posts` for non-operators. Included in `GET /api/operator/queue` (§2.14). Notification dispatched to on-duty operators (see §2.14.3). |
  | **Business rules** | Default: not the default level — author must explicitly opt in. Author MAY downgrade to level 2, 3, or 4 only if the post has not yet been assigned to a match case (`matching_cases.status` is null or `unassigned`). Once an operator has begun working a case, the author SHOULD request a level change through the operator (product policy). Operators SHALL NOT share author identity outside the operator workspace unless the author grants explicit consent or the match flow results in mutual opt-in (§2.14.4). |
  | **Edge cases** | **Reports:** Admins can view the post for moderation even though it is invisible to the public. **Legal retention:** Post and identity data are retained per platform data-retention policy even if the author later deletes the post; audit log records the deletion event. **Author views own post:** Author can always see their own post in their profile's "my posts" section, tagged with an "operators only" badge. |

  **Level 2 — Operators + followers ("Also exposed to friends (followers)")**

  | Aspect | Details |
  |--------|--------|
  | **Description** | Same high-privacy treatment for the general public, but the author's **followers** (per `user_follows`) may see a **scoped view** of the post. Operators still see the full matching context. |
  | **Who can see what** | **Operators:** identical to Level 1 — full content and identity. **Followers:** see post title, description text, category, and creation timestamp; author displayed as **first name + last initial** (e.g. "David S.") with a generic avatar unless the author has opted to show their real avatar to followers. Contact details (phone, email, exact address) are **masked**. Followers MAY interact (like, comment) but cannot view the author's full profile link — tapping the author name shows a "private profile" placeholder. **Non-follower authenticated users / guests:** post is hidden (same as Level 1). **Admins:** full access. |
  | **Inputs** | Author selects `anonymity_level = 2`. Same optional metadata fields as Level 1. |
  | **Outputs** | Post appears in `GET /api/posts` only for users in the author's follower set (server-side `JOIN user_follows`). Also appears in the operator queue if configured by policy (product decision: **YES** — Level 2 posts SHALL also enter the operator queue for potential matching assistance, but operators are not required to act on them). |
  | **Business rules** | Author MAY change from Level 2 → Level 1 (restrict further) at any time. Downgrade to Level 3/4 allowed only before any match case is opened. Follower interaction (likes/comments) is visible to the author and other followers but not to the general public. |
  | **Edge cases** | If a follower unfollows the author after seeing the post, the post disappears from their feed on the next refresh. Comment history from unfollowed user remains but author name is masked. |

  **Level 3 — Public limited ("exposed to everyone without all the details")**------|
  | **Description** | Post is visible in the broader public feed with **strong redaction** of identifying details. Intended for users who want community visibility for their need/offer but prefer privacy. |
  | **Who can see what** | **All authenticated users:** see post title, description, category, approximate location (city-level only — no street address), and creation timestamp. Author displayed as **anonymised placeholder** ("Community Member") with a system-default avatar. No direct contact details exposed. **Guests:** see post in public feed with same redactions as authenticated users. **Operators:** see full unredacted content and author identity (same as Level 1/2) — **product decision: operators MAY access richer internal fields for Level 3 posts to assist if the author later requests help**. **Admins:** full access. |
  | **Inputs** | Author selects `anonymity_level = 3`. |
  | **Outputs** | Post included in `GET /api/posts` for all users with redacted author fields. Post does NOT automatically enter the operator queue (unlike Levels 1–2). Author MAY later choose to "request operator help" which would create a match case from this post (see §2.14). |
  | **Business rules** | Author MAY upgrade privacy (move to Level 1 or 2) at any time. Downgrade to Level 4 (fully public) is a **one-way reveal** — once identity is published, it cannot be re-anonymised for users who already saw it (although the post can be deleted). Likes and comments are public. Users cannot DM the author directly from the post — a "contact through platform" button SHALL open a moderated request flow or display a "contact not available" message. |
  | **Edge cases** | If the post is linked to a donation/ride/item entity, the linked entity's own visibility rules also apply — the more restrictive level wins. Search indexing excludes author identity fields. |

  **Level 4 — Fully public ("exposed completely")**

  | Aspect | Details |
  |--------|--------|
  | **Description** | Normal public post visibility consistent with existing post types and the current privacy model. Author identity is fully visible. |
  | **Who can see what** | **All authenticated users:** full post content, author name, avatar, city, and profile link. **Guests:** same (subject to existing guest-mode restrictions). **Operators:** same as any other user (no special queue routing). **Admins:** full access. |
  | **Inputs** | Author selects `anonymity_level = 4` or does not specify (this is the **default** for backward compatibility with existing posts). |
  | **Outputs** | Standard feed inclusion. No operator queue routing. |
  | **Business rules** | This is the **default** level. Existing posts without an `anonymity_level` value SHALL be treated as Level 4. Author MAY upgrade privacy to Level 1–3 at any time (subject to match-case rules above). |
  | **Edge cases** | Identical to current post behavior. No new edge cases introduced. |ed. |

- **Cross-cutting rules for all levels:**
  - The `anonymity_level` column SHALL be stored as `SMALLINT` on the `posts` table (see §6.1.8) with a `CHECK (anonymity_level BETWEEN 1 AND 4)` and `DEFAULT 4`.
  - **Admin moderation:** Admins and super-admins can always view the full unredacted post regardless of level, for content moderation, legal compliance, and abuse investigation.
  - **Post creation flow (mobile):** The post-creation UI SHALL present the four options with clear Hebrew/English labels, a brief explanation of each level, and a visual indicator (e.g. lock icon gradient). The selected level is sent as part of the create-post DTO.
  - **API filtering:** `GET /api/posts` SHALL implement server-side filtering logic that checks `anonymity_level` against the requesting user's role and follow relationship to the author. This is a **required** behavior — there is not enough information in the code to determine whether any filtering logic exists today; the current `posts.service.ts` does not reference `anonymity_level` (see §10.1).
  - **Notifications:** When a post with Level 1 or 2 is created, a notification SHALL be dispatched to active operators (see §2.14.3). For Level 2, a separate notification MAY be sent to followers per the existing notification pattern.
#### 2.5.8 Give / Receive terminology + Request intent

- **Terminology (UI):** User-facing wording SHALL use **Give / Receive** (`לתת / לקבל`) and SHALL NOT expose legacy wording (Offerer/Seeker).
- **Post intent model:** Every newly created donation-context post SHALL include `intent`:
  - `intent = give`
  - `intent = request`
- **Creation entrypoints:**
  1. Center `+` action in bottom navigation (global)
  2. Receive-mode contextual CTA (“Can't find what you need? Request it →”)
- **Distribution rules:**
  - `give` → main feed + category give stream
  - `request` → main feed + category open-requests stream (surfaced in give-oriented context)
- **Visual differentiation:** Cards and list items SHALL display clear intent markers (badge/chip/icon/color) for `give` vs `request`, with localized labels in Hebrew/English.

#### 2.5.9 Give-mode category augmentation

- In give mode, category pages SHALL include a collapsible section above the publishing form:
  - Header: **Open Requests List**
  - First tap expands inline inventory of open request posts for the category
  - Second tap collapses back
