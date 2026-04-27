# Posts: visibility, workflow closure, anonymity, and statistics

**Type:** Technical reference (as-built behavior + alignment with SRS).  
**Not a substitute for:** [SRS functional §2.5 Posts](../SRS/functional/02-05-posts.md) or [§2.10 Statistics](../SRS/functional/02-10-statistics.md).  
**Audience:** Engineers implementing feed, profile, moderation, or `GET /api/stats/dashboard`.

---

## 1. Purpose

The product uses **several independent concepts** that are easy to conflate:

| Concept | Meaning in KC | Primary locus today |
|--------|----------------|---------------------|
| **Owner hide (soft hide)** | Author removes the post from default public feeds; reversable. | `posts.status` → `hidden` / `active` |
| **Workflow “open” vs “closed”** | Whether the **underlying offer** (task, ride, item/donation) is still active or finished. | Linked rows: `tasks`, `rides`, `items` (status columns) |
| **Anonymity level** | Who may see author identity and full content (SRS §2.5.7). | Spec: `posts.anonymity_level`; implementation maturity varies (see §10 gaps) |

This document explains **how the codebase combines them** for feeds, profile **Open / Closed** tabs, and **dashboard post counts**.

---

## 2. Terminology (normative distinction)

### 2.1 Owner visibility (hide / unhide)

- **Hide** (`POST /api/posts/:postId/hide`): sets `posts.status = 'hidden'`.
- **Unhide** (`POST /api/posts/:postId/unhide`): restores `posts.status = 'active'` (or equivalent non-hidden value).
- **Feed default:** list queries exclude rows where `posts.status = 'hidden'` unless the API explicitly allows viewing own hidden content.

**Important:** This is **not** the same as “the ride/item/task is completed.” A post can be **visible** (`active`) while the linked entity is already **completed** (workflow-closed).

### 2.2 Workflow closure (business lifecycle)

For structured post types, “closed” in the **product sense** (profile **Closed** tab, `isFeedItemOpen` in the mobile feed) follows **linked entity status**, not `posts.status`:

| Post pattern | “Open” (still in play) | “Closed” (finished / terminal) |
|--------------|------------------------|--------------------------------|
| Task posts (`task_assignment`, `task_completion`) | `tasks.status` ∈ `open`, `in_progress` | `tasks.status` ∈ `done`, `archived` |
| Ride posts (`ride` or `ride_id` set) | `rides.status` ∈ `active`, `full` (or missing → treated as active in clients) | `rides.status` ∈ `completed`, `cancelled` |
| Item / donation posts (`item`, `donation`, or `item_id` set) | `items.status` ∈ `available`, `reserved`, `active` | `items.status` ∈ `delivered`, `completed`, `expired` |
| General / challenge-style posts | Treated as “open” for tab/stat bucketing unless a future explicit post-level workflow flag exists | Not shown in profile **Closed** tab today |

### 2.3 Anonymity (SRS)

- **Requirement:** §2.5.7 defines `anonymity_level` (1–4) controlling **audience and redaction** of author/content.
- **Interaction with hide:** Anonymity governs *who sees what*; hide removes the post from default lists. A post can be highly anonymous **and** still `active`, or public **and** `hidden`.

---

## 3. Mobile: profile Open / Closed tabs

**Files:**

- Open tab: `apps/mobile/bottomBarScreens/profile/OpenRoute.tsx` + `apps/mobile/utils/profileOpenTabPostEntry.ts` (`classifyOpenProfilePost`).
- Closed tab: `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx`.

**Rules (as-built):**

- **Open:** includes a post when `classifyOpenProfilePost` returns `shouldInclude: true` (task/ride/item rules in §2.2; general posts included as open).
- **Closed:** includes task/ride/item/donation posts only when the linked status matches the “closed” column in §2.2. **Plain/general posts are not listed in Closed** (they have no closable workflow in this UI).

---

## 4. Mobile: main feed “open posts” filter

**File:** `apps/mobile/utils/feedFilters.ts` — `isFeedItemOpen(item)`.

This mirrors the same **workflow** notion as the profile Open tab for tasks, rides, and items/donations. It does **not** set `posts.status`.

---

## 5. API: `GET /api/stats/dashboard` post metrics

**File:** `apps/api/src/controllers/stats.controller.ts` (`getDashboardStats`).

**Semantics (as-built, aligned with profile tabs):**

- **`posts_total`:** count of posts where `posts.status` is **not** `hidden` (owner-hidden posts excluded from community totals).
- **`posts_open`:** among those visible posts, count rows that match the **Open** tab / `isFeedItemOpen` workflow (task/ride/item rules; general posts count as open).
- **`posts_closed`:** among those visible posts, count rows that match the **Closed** tab workflow (terminal task/ride/item statuses).

**Consequence:** `posts_open + posts_closed` can be **less than** `posts_total` when:

- A post has **no** linked task/ride/item (e.g. general content), or
- Joined status is missing/unknown — the row is neither classified open nor closed.

This matches the profile UX: such posts appear under **Open** (if shown at all) but not under **Closed**.

**Caching:** Same Redis key `dashboard_stats` as other dashboard fields; TTL unchanged in code (verify in controller when adjusting).

---

## 6. API: public post lists and hide

**File:** `apps/api/src/controllers/posts.controller.ts`.

- Default feed filters include `(p.status IS NULL OR p.status != 'hidden')`.
- Hide/unhide endpoints mutate **`posts.status` only**; they do not change `tasks` / `rides` / `items` lifecycle.

---

## 7. Recommended mental model for new features

1. **Owner visibility:** keep using `posts.status` for hide/unhide **or** introduce a dedicated `visibility` enum if you need more than `{active, hidden}` without overloading the word “status.”
2. **Workflow:** keep lifecycle on **domain tables** (`tasks`, `rides`, `items`); posts remain **projections** / cards pointing at those rows.
3. **Anonymity:** implement §2.5.7 as a **separate concern** from (1) and (2); never infer anonymity from `hidden` alone.

---

## 8. Related SRS sections

- §2.5.4 Post moderation (hide / unhide / delete)
- §2.5.6 Feed filtering and sorting
- §2.5.7 Post anonymity levels
- §2.10 Statistics (`/api/stats`)

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-04-27 | Initial document: separate hide vs workflow vs anonymity; map profile tabs, feed helper, and dashboard SQL semantics. |
