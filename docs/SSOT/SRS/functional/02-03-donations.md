> **SRS shard:** `SRS/functional/02-03-donations.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.3 Donations Module (`modules/donations`)

#### 2.3.1 Donation Categories

- **Description:** Categorized donation types
- **Endpoints:**
  - `GET /api/donations/categories` — list all categories
  - `GET /api/donations/categories/:slug` — get category by slug
- **Categories observed in mobile navigation:** The **Donations** tab stack registers **items**, **rides (Trump)**, and **challenges** flows only (`ItemsScreen`, `TrumpScreen`, `CommunityChallengesScreen`, related challenge screens). Other slugs may still exist in `GET /api/donations/categories` and legacy/orphan mobile files; see §10.1 for reconciliation with the historical long tail.

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

#### 2.3.3 Knowledge donations (API; mobile tab entry removed)

- **Mobile:** `KnowledgeScreen` is **not** registered on `DonationsStack` (removed from the in-tab category grid). Re-introducing a client SHALL follow the API contracts below.
- **Seeker mode (`mode=search`):** When a knowledge UI exists, it SHALL **not** show legacy mock “educational links” or mock community listings. It SHALL show the **public list** of community-submitted knowledge links (`GET /api/donations/knowledge/links`). **Adding** a link SHALL occur in **offerer** mode via `AddLinkComponent` (category `knowledge`) backed by `POST /api/donations/knowledge/links`.
- **Offerer mode (`mode=offer`):** The screen SHALL invite users who want to **volunteer knowledge** to submit a short message. Submitting SHALL create an **internal admin task** (title pattern **בקשה לתרומת מידע —** *requester*, body with requester profile + message text) assigned to the **root super-admin** (resolved server-side: `ROOT_ADMIN_EMAIL` if set, otherwise the API’s documented principal-admin profile email — **DB lookup only**, no outbound email). Endpoint: `POST /api/donations/knowledge/contribution-request` (`JwtAuthGuard` only). Optional free-text `message` (length-capped). If the server cannot resolve an assignee (no matching `user_profiles` row), the client SHALL surface a clear error (e.g. toast); **no** client-side `mailto` fallback.
- **Community knowledge links:** `GET /api/donations/knowledge/links` (public list), `POST /api/donations/knowledge/links` (public create — no admin approval), `DELETE /api/donations/knowledge/links/:id` (admin/org_admin/super_admin only). Storage: table `knowledge_community_links` (created at runtime if missing).
- **Future:** Direct upload of files/video/text from the app for knowledge offers is **out of scope** for this slice; only the intake described above is required.

#### 2.3.4 Donation Category Naming: Matchmaking vs Shiduchim Tov

This section disambiguates two distinct concepts that share similar Hebrew vocabulary.

| Attribute | Matchmaking | Shiduchim Tov (Good Matching) — Good Matching |
|-----------|----------------------|--------------------------------------------|
| **Internal slug** | `matchmaking` (as implemented) | `shiduchim-tov` (required — see §10.1) |
| **Hebrew UI label** | "Matches" | "Good matches" |
| **English UI label** | "Matchmaking" | "Good Matching" |
| **Purpose** | Volunteering to help **singles** find romantic partners — connecting matchmakers with people seeking introductions | **Social-good matching**: coordinating community **needs** (requests for help) with **volunteers/donors** (capabilities), managed by trained **operators** (call-center brokers) |
| **User experience** | Standard donation-category screen with informational content and optional external resources Dedicated **operator workspace** with matching queue, case detail, candidate lists, and action flows (see §2.15) |
| **Visible to** | All authenticated users (standard category) | All authenticated users see an **explainer / entry** view; **operators** see the full workspace (queue + matching tools) |
| **Related module** | §2.3 Donations §2.14 Operator Matching, §2.15 Shiduchim Tov Workspace |

**Product decision:** The existing `matchmaking` category (`MatchmakingScreen` at `donationScreens/MatchmakingScreen.tsx`, i18n key `donations:categories.matchmaking`) SHALL remain unchanged. "Shiduchim Tov" is an **additional, separate** top-level entry (see §2.15, §4.4) — **not** a replacement.

**i18n guidance (implementation note):** New locale keys SHOULD be added under `donations:categories.shiduchimTov` (or a dedicated namespace `operator`) for Hebrew and English. Existing `donations:categories.matchmaking` keys remain untouched. Strings belong in `locales/he/*.json` and `locales/en/*.json` — the SRS only describes naming intent.