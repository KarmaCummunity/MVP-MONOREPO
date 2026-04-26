> **SRS shard:** `SRS/functional/02-14-operator-matching.md` — part of [SRS index](../README.md). References § refer to the full document.

### 2.14 Operator Matching Module (NEW — `modules/operator-matching`)

#### 2.14.1 Overview

- **Description:** An end-to-end **manual, human-in-the-loop** matching workflow where trained **operators** (callers) review high-privacy community requests and pair them with suitable volunteers or donors. This is **not** an automated recommendation engine — operators use judgment, local knowledge, and platform data to propose matches.
- **Relationship to posts:** Posts at **anonymity level 1** (operators only) are **automatically** routed to the matching queue. Posts at **anonymity level 2** (operators + followers) are **also** routed to the queue (product decision — operators may assist even when followers can see the post). Posts at level 3 or 4 are **not** auto-routed but the author may **manually request** operator assistance via a "request help from operator" action, which creates a match case.
- **Role requirement:** A new role string **`operator`** SHALL be added to the `user_profiles.roles` array vocabulary. Only users whose `roles` include `operator` (or `admin`/`super_admin` for oversight) can access operator endpoints and the matching workspace. **There is not enough information in the code to determine** — the `operator` role does not exist in the current codebase; it must be added to `AdminAuthGuard` or a new `OperatorAuthGuard` (see §10.1).

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

#### 2.14.3 Match Case Managementms a queue item, they create or work within a **match case** — a structured record linking a requester (the post author) with one or more candidate volunteers/donors.
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

