> **SRS shard:** `SRS/functional/02-15-shiduchim-tov-workspace.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.15 Shiduchim Tov Workspace (NEW — Donations Navigation Entry)

#### 2.15.1 Overview

- **Description:** "Shiduchim Tov" ("Shiduchim Tov" / Good Matching) is a **new top-level entry** within the donations experience (same tab/stack pattern as other donation categories). It serves as the **front door** to the operator-assisted matching system (§2.14) from the mobile/web client.
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
  - "Claim" button to assign yourself as operator for an item.

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
  These screens SHALL be registered within `DonationsStack` (or a nested navigator if the team prefers isolation). Verify actual navigation structure during implementation.*
  - Workspace data is fetched exclusively from `/api/operator/*` endpoints (§2.14).
  - All operator actions trigger audit log entries.
  - If the operator's role is revoked mid-session, the next API call returns 403 and the client SHALL redirect to the explainer view with a toast message.

---

