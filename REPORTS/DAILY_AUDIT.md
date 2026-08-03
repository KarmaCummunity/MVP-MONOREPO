# 🛡️ Daily Audit Report: 2026-08-03

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — same as 2026-08-02)  
**Scope:** Holistic re-verification of prior critical findings + secret/DDL/auth/npm scans  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–354, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers` ~580–627) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId` ~600–615, ~945–981) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` (~246–269) reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; create accepts body `driver_id` ~47–75; booking status update ~505–569); `crm.controller.ts` (no guards on list/create/delete); `community-members.controller.ts`; `items-delivery.controller.ts` → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed `driver_id` / ownership fields.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 `JWT_SECRET=…`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`, invoked via `ensurePostsTable` on list/create paths ~842+); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1 (60 req/60s); keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (three consecutive runs): **37 → 61 → 89** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; do not treat a single audit count as authoritative.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` (~380) + `finalizePerformerCompletionPost` in `tasks-side-effects.service.ts`. Recommendation: Idempotent completion (unique constraint on task completion post / guard on prior `done`).

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~324) but pushes `type: 'task_post'` (~351), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface).

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#117 and 2026-08-02 report branch) appear **unmerged** into `dev`; HEAD unchanged since merge #101 — findings persist day-over-day.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2.7k LOC, hierarchy/user services) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-03)

| Check | Result |
|-------|--------|
| HEAD vs prior audit | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted | Confirmed |
| Chat OptionalAuth guest read | Confirmed |
| Rides/CRM/items-delivery unguarded | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook | Confirmed |
| Tracked data-backups JSON count | 49 |
| Request-path `DROP TABLE … CASCADE` (posts/tasks) | Confirmed |
| Global `APP_GUARD` Throttler | Absent |
| npm audit (3 runs) | 37 → 61 → 89; critical 4 packages |
| Confirmed request-handler SQLi | None new (parameterized queries dominant; DDL/import identifier interpolation remains maintenance risk) |

---
