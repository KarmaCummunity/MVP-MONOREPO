# 🛡️ Daily Audit Report: 2026-08-12

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — **identical to 2026-08-11 audit**; no commits since merge #101)  
**Branch:** `cursor/daily-repository-audit-dc1b`  
**Scope:** Re-verify four known high-severity logic bugs with file:line evidence; Clean Architecture folder scan; mobile debt hubs; `tech-debt-log.md` overlap  
**SRS mapping:** NFR / functional auth, tasks, rides (`docs/SSOT/SRS/`); CA target `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md`  
**Mode:** Report-only (no product code fixes)

## Verdict (focused re-check)

All four known logic issues **still present**. Product code for these paths last touched **2026-04/05**; merge #101 only changed `posts.controller.ts` images column — **orthogonal**. Confidence **high** on all four.

| # | Issue | Status | Confidence | Primary evidence |
|---|--------|--------|------------|------------------|
| 1 | Auth refresh waiters hang | **STILL EXISTS** | **High** | `apps/mobile/auth/interceptors/authFetchInterceptor.ts` L9–19, L47–89 |
| 2 | ClosedRoute task type inconsistency | **STILL EXISTS** | **High** | `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` L104, L324–325, L351 |
| 3 | Task done PATCH duplicate completion posts | **STILL EXISTS** | **High** | `apps/api/src/tasks/tasks-patch-mutation.service.ts` L380–382; `tasks-side-effects.service.ts` L447–477; controller never passes `oldStatus` into mutation |
| 4 | Ride booking approval oversell | **STILL EXISTS** | **High** | `apps/api/src/controllers/rides.controller.ts` L505–569 (approve then soft “full”; no pre-approve capacity reject) |

## 1. Auth refresh waiters hang — CONFIRMED

**Files:** `apps/mobile/auth/interceptors/authFetchInterceptor.ts`

- Module state: `isRefreshing` + `refreshSubscribers` (L9–10); `subscribeTokenRefresh` / `onRefreshed` (L12–18).
- Concurrent 401 while refresh in flight: waiter returns `new Promise` subscribed via `subscribeTokenRefresh` (L82–89) — resolves only if `onRefreshed` runs.
- Failure / missing `accessToken` path (L75–81): sets `isRefreshing = false`, **clears** `refreshSubscribers = []` **without calling subscribers**, then clears session. Waiters remain pending forever.

**Trigger:** Two+ parallel `fetchWithAuth` calls get 401; first owns refresh; refresh fails (network, 401 refresh, or response without `accessToken`). Second (and later) callers hang indefinitely — UI/network stuck, no logout callback for waiters.

**Fix direction:** On every terminal refresh path (success without token, catch, no refresh token), reject/resolve all subscribers (e.g. reject with error or resolve with 401 response) before clearing the array; never drop waiters silently.

## 2. ClosedRoute task type inconsistency — CONFIRMED

**File:** `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx`

- Posts path for `task_assignment` / `task_completion`: `type = 'task'` (L100–104).
- Dedup set built with `c.type === 'task' && c.taskData?.id` (L322–325).
- Direct `getTasks` path pushes `type: 'task_post'` (L342–351).

**Trigger / effect:** Closed tab mixes `type: 'task'` (from posts) and `type: 'task_post'` (from tasks API). Any renderer / filter that branches on a single task type mishandles one path. Dedup against post-derived rows works **only when** `p.task.id` is present (filter matches `'task'`); if nested `task` lacks `id`, getTasks can add a second card with the other type.

**Fix direction:** One canonical type (align with `FeedItem`); use the same constant in posts mapping, dedup filter, and getTasks push.

## 3. Task done PATCH duplicate completion posts — CONFIRMED

**Files:**
- `apps/api/src/tasks/tasks-patch-mutation.service.ts` L380–382
- `apps/api/src/tasks/tasks-side-effects.service.ts` `finalizePerformerCompletionPost` L447–477
- `apps/api/src/tasks/tasks.controller.ts` L486–520 (`oldStatus` loaded but **not** passed into `applyTaskPatchMutation`)

```text
// patch mutation — no oldStatus transition guard:
if (rows.length > 0 && body.status === "done") {
  await this.sideEffects.runUpdateTaskCompletionPosts(rows[0]);
}
```

`finalizePerformerCompletionPost`: UPDATE only when `post_type = 'task_assignment'` (L456). After first completion, rows are already `task_completion` → UPDATE matches 0 → **INSERT** new completion post (L471–477).

**Trigger:** Task already `done`; client (or retry) `PATCH /api/tasks/:id` with `{ "status": "done" }` again → another completion post per performer; feed/profile spam; possible repeated creator notification (`sendTaskCompletedNotificationToCreator`).

**Fix direction:** Gate side effects on `oldStatus !== "done"` (pass `oldStatus` into mutation); make completion finalize idempotent (upsert / unique on `(task_id, author_id, post_type)`).

## 4. Ride booking approval oversell — CONFIRMED

**File:** `apps/api/src/controllers/rides.controller.ts`

- `bookRide` (L405–409) checks remaining vs **already approved** seats before insert; pending bookings do not consume capacity.
- `updateBookingStatus` (L505–569): **UPDATE status first** (L514–522), then if `approved`, compute remaining (including this booking) and only set ride `status = 'full'` when `remaining_seats <= 0` (L548–554). **Never rejects** approval when seats would go negative. No `FOR UPDATE` / capacity check before approve.

**Trigger:** Ride `available_seats = 2`. Two pending bookings each request 2 seats. Approve both → 4 approved seats on a 2-seat ride. Or approve a 2-seat booking when 1 seat remains → `remaining_seats = -1`, still `success: true`.

**Fix direction:** In one transaction, lock ride + approved bookings; reject approve when `approved_sum + seats_requested > available_seats`; only then set status.

## Clean Architecture

| Check | Result |
|-------|--------|
| `/domain` or `/application` under `apps/` or `packages/` | **None** (count **0**; also no `/infrastructure` folders) |
| `packages/` | Only `config-eslint` |
| Pure domain-like islands under `apps/api/src/tasks/` | **Yes** — no Nest/`pg` imports: `task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`, `tasks.types.ts` (+ colocated specs). Services/controller still inject `Pool`. |
| Target | `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` — Infrastructure → Application → Domain (**not implemented** as layers) |

## Mobile debt hubs (LOC)

| File | Lines | tech-debt-log |
|------|------:|---------------|
| `apps/mobile/utils/databaseService.ts` | **1225** | Logged 2026-05-03 `[PENDING REFACTOR]` |
| `apps/mobile/utils/apiService.ts` | **1055** | Not named |
| `apps/mobile/google_auth/SecureApiService.ts` | **1165** | Not named (duplication vs `apiService`) |
| `apps/mobile/utils/enhancedDatabaseService.ts` | **897** | Not named |

~**196** `apps`/`packages` `.ts`/`.tsx` sources >200 LOC guideline.

## tech-debt-log.md relevant items

- **Logged:** `databaseService.ts` large legacy surface (2026-05-03); Maestro CI; APM; orphan donation wrappers; admin tables API without mobile UI.
- **Not logged by name:** auth refresh waiters hang; ClosedRoute task type; task completion post duplicates; ride approval oversell; `SecureApiService` / `apiService` duplication; missing CA `/domain`/`/application` folders.

## Commits since merge #101 vs HEAD `3d92f9d`

- `HEAD` **is** `3d92f9d` (Merge PR #101).
- `git log 3d92f9d..HEAD` → **empty**.
- Merge #101 diff: only `apps/api/src/controllers/posts.controller.ts` (+8/−3 images column).
- Bug files last commits: auth interceptor `f48b303` (2026-04-29); ClosedRoute `28984de` (2026-05-03); tasks-patch-mutation `5f5b9bc` (2026-05-03); rides.controller `8fb4b2b` (2026-05-03).
- **Conclusion:** Code for these four issues is **unchanged** relative to merge #101 / prior daily audits.

### Verification evidence (2026-08-12)

| Check | Result |
|-------|--------|
| HEAD | `3d92f9d` (= merge #101) |
| Commits after #101 | none |
| `find apps packages -type d \( -name domain -o -name application \)` | 0 |
| npm audit (one run) | total **45**; critical **4** (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) — registry totals historically volatile ~45–96 for this lockfile |
| Product fixes this pass | none (report-only) |

---

---

# 🛡️ Daily Audit Report: 2026-08-11

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02)  
**Scope:** Holistic re-verification of persistent critical findings + secret/DDL/auth/npm/architecture scans; no new product commits on `dev` since 2026-08-10 audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat functional areas (`docs/SSOT/SRS/functional/*`)  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers`) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Unauthenticated user list / profile read (PII enumeration)** — File: `apps/api/src/controllers/users.controller.ts` (`GET :id` ~121–123, `GET /` ~135–149) — no `@UseGuards` → Action: Require JWT (and ownership/admin for sensitive fields) before returning user profiles or searchable user directories.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId`; `promoteToAdmin` / `manageHierarchy` trusts body actor/`managerId`) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** — File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` ~91–93, `GET hierarchy/tree` ~96–98) — no `@UseGuards` → Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` / conversation reads authorizes by path/`conversationId` alone when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; booking accepts body `passenger_id` ~374–468; booking status update ~505–555); `crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` (includes unauthenticated clear) → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed passenger/driver/ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 hardcoded `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~102 / ~126 document JWT values); `docs/SSOT/runbooks/api/test-redis-production.md` (Redis/Postgres password fragments); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT/Redis material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders. (Secret values intentionally omitted from this report.)

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`, invoked via `ensurePostsTable` on request paths); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1; keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (two consecutive runs): **45 → 95** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; report observed range/max rather than a single count. Historical observed range for this lockfile remains roughly **45–96** with the same critical set — treat registry totals as volatile.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) is auth-gated (`JwtAuthGuard`) but lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` (~380) calls completion side effects whenever `body.status === "done"` without requiring a transition from a non-done status; `finalizePerformerCompletionPost` INSERTs a new `task_completion` post when no matching assignment row is updated. Recommendation: Gate completion side effects on `oldStatus !== "done"`; add idempotent unique constraint / upsert for completion posts.

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~324) but pushes `type: 'task_post'` (~351), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant matching `FeedItem.type`).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface). Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`.

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **Android network security (positive)** — `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release and debug base config; debug overlay allows cleartext only for explicit domains. No new cleartext production exposure found in this pass.

* **XSS / classic SQLi (scan notes)** — No `dangerouslySetInnerHTML` / runtime `eval(` under `apps/`. API request query paths reviewed remain largely parameterized (`$1`…); script-only table-name interpolation exists in offline import/export helpers. High-risk pattern remains dynamic DDL and authz bypasses rather than classic string-concat SQLi in hot HTTP paths.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#126 and related report-only branches) remain **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk. Auth refresh hang, ClosedRoute types, task completion duplicates, and ride oversell are **not** yet logged there.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `community-group-challenges.controller.ts` ~1097 LOC, `donations.controller.ts` ~892 LOC, `chat.controller.ts` ~813 LOC, `rides.controller.ts` ~779 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` ~1055 LOC vs `SecureApiService.ts` ~1165 LOC; `databaseService.ts` ~1225 LOC vs `enhancedDatabaseService.ts` ~897 LOC) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`). ~196 TypeScript source files exceed the ~200 LOC guideline.

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump); `apps/mobile/android/app/debug.keystore` — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-11)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-10) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Unauthenticated `GET /api/users` + `GET :id` | Confirmed (called out explicitly this pass) |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| OptionalAuthGuard always-true + chat guest conversations | Confirmed |
| Rides unguarded + passenger_id spoof + approve oversell | Confirmed |
| DROP TABLE on posts ensure path / tasks-schema / DatabaseInit | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook + 49 backups | Confirmed |
| ThrottlerModule without `APP_GUARD` | Confirmed |
| npm audit (two runs) | 45 → 95 total; critical 4 (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) |
| ClosedRoute `task` vs `task_post` mismatch | Confirmed |
| Auth refresh waiter hang on failure | Confirmed |
| Domain/Application folders under apps/ | Absent |
| CRM / community-members / items-delivery / rate-limit | No `@UseGuards` on controllers |
| XSS patterns (`dangerouslySetInnerHTML` / runtime `eval`) | None found under `apps/` |

---

# 🛡️ Daily Audit Report: 2026-08-10

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02)  
**Scope:** Holistic re-verification of persistent critical findings + secret/DDL/auth/npm/architecture scans; no new product commits on `dev` since 2026-08-09 audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers`) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId`; `promoteToAdmin` / `manageHierarchy` trusts body actor/`managerId`) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** — File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` ~91–93, `GET hierarchy/tree` ~96–98) — no `@UseGuards` → Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; booking accepts body `passenger_id` ~414; booking status update ~505–555); `crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed passenger/driver/ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 hardcoded `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); `docs/SSOT/runbooks/api/test-redis-production.md` (Redis/Postgres password fragments); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT/Redis material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`, invoked via `ensurePostsTable` on request paths); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1; keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (two consecutive runs): **95 → 96** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; report observed range/max rather than a single count. Prior days observed as low as 45 with the same critical set — treat registry totals as volatile.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) is auth-gated (`JwtAuthGuard`) but lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` (~380) calls `runUpdateTaskCompletionPosts` whenever `body.status === "done"` without requiring a transition from a non-done status; `finalizePerformerCompletionPost` INSERTs a new `task_completion` post when no matching assignment row is updated. Recommendation: Gate completion side effects on `oldStatus !== "done"`; add idempotent unique constraint / upsert for completion posts.

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~324) but pushes `type: 'task_post'` (~351), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface). Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`.

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **Android network security (positive)** — `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release and debug base config; debug overlay allows cleartext only for explicit domains. No new cleartext production exposure found in this pass.

* **XSS / classic SQLi (scan notes)** — No `dangerouslySetInnerHTML` / `innerHTML` usage in mobile TS/TSX. API query paths reviewed remain largely parameterized (`$1`…); high-risk pattern remains dynamic DDL and authz bypasses rather than classic string-concat SQLi in hot paths.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#124 and related report-only branches) remain **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `community-group-challenges.controller.ts` ~1097 LOC, `chat.controller.ts` ~813 LOC, `rides.controller.ts` ~779 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` ~1055 LOC vs `SecureApiService.ts` ~1165 LOC; `databaseService.ts` ~1225 LOC vs `enhancedDatabaseService.ts` ~897 LOC) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`). ~196 TypeScript source files exceed the ~200 LOC guideline.

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump); `apps/mobile/android/app/debug.keystore` — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-10)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-09) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| OptionalAuthGuard always-true + chat guest conversations | Confirmed |
| Rides unguarded + passenger_id spoof + approve oversell | Confirmed |
| DROP TABLE on posts ensure path / tasks-schema / DatabaseInit | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook + 49 backups | Confirmed |
| ThrottlerModule without `APP_GUARD` | Confirmed |
| npm audit (two runs) | 95 → 96 total; critical 4 (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) |
| ClosedRoute `task` vs `task_post` mismatch | Confirmed |
| Auth refresh waiter hang on failure | Confirmed |
| Domain/Application folders under apps/ | Absent |
| CRM / community-members / items-delivery / rate-limit | No `@UseGuards` on controllers |
| XSS patterns (`dangerouslySetInnerHTML` / `innerHTML`) | None found in mobile TS/TSX |

---

# 🛡️ Daily Audit Report: 2026-08-09

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02)  
**Scope:** Holistic re-verification of persistent critical findings + secret/DDL/auth/npm/architecture scans; no new product commits on `dev` since 2026-08-08 audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342, `buildResolveSuccessResponse`, `linkResolveIdentifiers`) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId`; `promoteToAdmin` / `manageHierarchy` trusts body actor/`managerId`) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** — File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` ~91–93, `GET hierarchy/tree` ~96–98) — no `@UseGuards` → Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; booking accepts body `passenger_id` ~414; booking status update ~505–555); `crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed passenger/driver/ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 hardcoded `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); `docs/SSOT/runbooks/api/test-redis-production.md` (Redis/Postgres password fragments); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT/Redis material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1; keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (two consecutive runs): **45 → 95** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; report observed range/max rather than a single count.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` + completion finalization in `tasks-side-effects.service.ts`. Recommendation: Idempotent completion (unique constraint on task completion post / guard on prior `done`).

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~324) but pushes `type: 'task_post'` (~351), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface). Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`.

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **Android network security (positive)** — `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release and debug base config; debug overlay allows cleartext only for explicit domains. No new cleartext production exposure found in this pass.

* **XSS / classic SQLi (scan notes)** — No `dangerouslySetInnerHTML` / `innerHTML` usage in mobile TS/TSX. API query paths reviewed remain largely parameterized (`$1`…); high-risk pattern remains dynamic DDL and authz bypasses rather than classic string-concat SQLi in hot paths.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#124 and related report-only branches) remain **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `chat.controller.ts` ~813 LOC, `rides.controller.ts` ~779 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` vs `SecureApiService.ts`; `databaseService.ts` vs `enhancedDatabaseService.ts`) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`).

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump); `apps/mobile/android/app/debug.keystore` — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-09)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-08) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| OptionalAuthGuard always-true + chat guest conversations | Confirmed |
| Rides unguarded + passenger_id spoof + approve oversell | Confirmed |
| DROP TABLE on posts ensure path / tasks-schema / DatabaseInit | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook + 49 backups | Confirmed |
| ThrottlerModule without `APP_GUARD` | Confirmed |
| npm audit (two runs) | 45 → 95 total; critical 4 (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) |
| ClosedRoute `task` vs `task_post` mismatch | Confirmed |
| Auth refresh waiter hang on failure | Confirmed |
| Domain/Application folders under apps/ | Absent |
| CRM / community-members / items-delivery / rate-limit | No `@UseGuards` on controllers |

---

# 🛡️ Daily Audit Report: 2026-08-08

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02)  
**Scope:** Holistic re-verification of persistent critical findings + secret/DDL/auth/npm/architecture scans; no new product commits on `dev` since 2026-08-07 audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers` ~580–627) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId`; `promoteToAdmin` / `manageHierarchy` trusts body actor/`managerId`) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** — File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` ~91–93, `GET hierarchy/tree` ~96–98) — no `@UseGuards` → Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` (~246–269) reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; booking accepts body `passenger_id` ~414; booking status update ~505–555); `crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed passenger/driver/ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 hardcoded `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); `docs/SSOT/runbooks/api/test-redis-production.md` (Redis/Postgres password fragments); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT/Redis material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1; keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (two consecutive runs): **45 → 95** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; report observed range/max rather than a single count.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` (~380) + completion finalization in `tasks-side-effects.service.ts`. Recommendation: Idempotent completion (unique constraint on task completion post / guard on prior `done`).

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~322–326) but pushes `type: 'task_post'` (~351–352), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface). Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`.

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **Android network security (positive)** — `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release and debug base config; debug overlay allows cleartext only for explicit domains. No new cleartext production exposure found in this pass.

* **XSS / classic SQLi (scan notes)** — No `dangerouslySetInnerHTML` / `innerHTML` usage in mobile TS/TSX. API query paths reviewed remain largely parameterized (`$1`…); high-risk pattern remains dynamic DDL and authz bypasses rather than classic string-concat SQLi in hot paths.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#123 and related report-only branches) remain **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `chat.controller.ts` ~813 LOC, `rides.controller.ts` ~779 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` vs `SecureApiService.ts`; `databaseService.ts` vs `enhancedDatabaseService.ts`) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`).

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump); `apps/mobile/android/app/debug.keystore` — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-08)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-07) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| OptionalAuthGuard always-true + chat guest conversations | Confirmed |
| Rides unguarded + passenger_id spoof + approve oversell | Confirmed |
| DROP TABLE on posts ensure path / tasks-schema / DatabaseInit | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook + 49 backups | Confirmed |
| ThrottlerModule without `APP_GUARD` | Confirmed |
| npm audit (two runs) | 45 → 95 total; critical 4 (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) |
| ClosedRoute `task` vs `task_post` mismatch | Confirmed |
| Auth refresh waiter hang on failure | Confirmed |
| Domain/Application folders under apps/ | Absent |

---

# 🛡️ Daily Audit Report: 2026-08-07

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02)  
**Scope:** Holistic re-verification of persistent critical findings + secret/DDL/auth/npm/architecture scans; no new product commits on `dev` since 2026-08-06 audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers` ~580–627) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId`; `promoteToAdmin` ~945–981; `manageHierarchy` trusts body `managerId` ~871–908) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** — File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` ~91–93, `GET hierarchy/tree` ~96–98) — no `@UseGuards` → Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` (~246–269) reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; booking accepts body `passenger_id` ~414; booking status update ~505–555); `crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed passenger/driver/ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 hardcoded `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); `docs/SSOT/runbooks/api/test-redis-production.md` (Redis/Postgres password fragments); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT/Redis material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1; keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (two consecutive runs): **37 → 61** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; report observed range/max rather than a single count.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` (~380) + completion finalization in `tasks-side-effects.service.ts`. Recommendation: Idempotent completion (unique constraint on task completion post / guard on prior `done`).

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~322–326) but pushes `type: 'task_post'` (~351–352), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface). Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`.

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **Android network security (positive)** — `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release and debug base config; debug overlay allows cleartext only for explicit domains. No new cleartext production exposure found in this pass.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#122 and related report-only branches) remain **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `chat.controller.ts` ~813 LOC, `rides.controller.ts` ~779 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` vs `SecureApiService.ts`; `databaseService.ts` vs `enhancedDatabaseService.ts`) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`).

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump); `apps/mobile/android/app/debug.keystore` — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-07)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-06) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| OptionalAuthGuard always-true + chat guest conversations | Confirmed |
| Rides unguarded + passenger_id spoof + approve oversell | Confirmed |
| DROP TABLE on posts ensure path / tasks-schema / DatabaseInit | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook + 49 backups | Confirmed |
| ThrottlerModule without `APP_GUARD` | Confirmed |
| npm audit (two runs) | 37 → 61 total; critical 4 (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) |
| ClosedRoute `task` vs `task_post` mismatch | Confirmed |
| Auth refresh waiter hang on failure | Confirmed |
| Domain/Application folders under apps/ | Absent |

---


# 🛡️ Daily Audit Report: 2026-08-06

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02)  
**Scope:** Holistic re-verification of persistent critical findings + secret/DDL/auth/npm/architecture scans; no new product commits on `dev` since 2026-08-05 audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers` ~580–627) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId`; `promoteToAdmin` ~945–981; `manageHierarchy` trusts body `managerId` ~871–908) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** — File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` ~91–93, `GET hierarchy/tree` ~96–98) — no `@UseGuards` → Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` (~246–269) reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; booking accepts body `passenger_id` ~414; booking status update ~505–555); `crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed passenger/driver/ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); `docs/SSOT/runbooks/api/test-redis-production.md` (Redis/Postgres password fragments); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT/Redis material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1; keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (two consecutive runs): **37 → 61** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; report observed range/max rather than a single count.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` (~380) + completion finalization in `tasks-side-effects.service.ts`. Recommendation: Idempotent completion (unique constraint on task completion post / guard on prior `done`).

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~322–326) but pushes `type: 'task_post'` (~351–352), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface). Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`.

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **Android network security (positive)** — `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release and debug base config; debug overlay allows cleartext only for explicit domains. No new cleartext production exposure found in this pass.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#121 and related report-only branches) remain **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `chat.controller.ts` ~813 LOC, `rides.controller.ts` ~779 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` vs `SecureApiService.ts`; `databaseService.ts` vs `enhancedDatabaseService.ts`) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`).

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump); `apps/mobile/android/app/debug.keystore` — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-06)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-05) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| OptionalAuthGuard always-true + chat guest conversations | Confirmed |
| Rides unguarded + passenger_id spoof + approve oversell | Confirmed |
| DROP TABLE on posts ensure path / tasks-schema / DatabaseInit | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook + 49 backups | Confirmed |
| ThrottlerModule without `APP_GUARD` | Confirmed |
| npm audit (two runs) | 37 → 61 total; critical 4 (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) |
| ClosedRoute `task` vs `task_post` mismatch | Confirmed |
| Auth refresh waiter hang on failure | Confirmed |
| Domain/Application folders under apps/ | Absent |

---

# 🛡️ Daily Audit Report: 2026-08-05

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02 through 2026-08-04)  
**Scope:** Holistic re-verification of prior critical findings + secret/DDL/auth/npm/architecture scans; no new product commits on `dev` since last audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers` ~580–627) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId` ~600–615, ~945–981; `manageHierarchy` trusts body `managerId` ~871–908) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** — File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` ~91, `GET hierarchy/tree` ~96) — no `@UseGuards` → Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` (~246–269) reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; create accepts body `driver_id`; booking status update ~505–555); `crm.controller.ts` (no guards on list/create/delete); `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` (anonymous `clear` / `stress-test` / `simulate`) → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed `driver_id` / ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`, invoked via `ensurePostsTable` on list/create paths ~830–842); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1 (60 req/60s); keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** — Evidence at audit time (three consecutive runs): **37 → 61 → 89** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` → Action: Pin/upgrade resolving parents; re-check after lockfile changes; do not treat a single audit count as authoritative.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** — `rides.controller.ts` `updateBookingStatus` (~514–555) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** — `apps/api/src/tasks/tasks.controller.ts` (~74–146) lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** — `tasks-patch-mutation.service.ts` (~380) + `finalizePerformerCompletionPost` in `tasks-side-effects.service.ts` (~447–477). Recommendation: Idempotent completion (unique constraint on task completion post / guard on prior `done`).

* **Auth refresh waiters hang on failure** — `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** — `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~322–326) but pushes `type: 'task_post'` (~351–352), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*`** — Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly (infrastructure leaking into “use case” surface). Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`.

* **Schema ownership in controllers** — Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** — Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** — Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **Android network security (positive)** — `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release and debug base config; debug overlay allows cleartext only for explicit domains. No new cleartext production exposure found in this pass.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#120 and related report-only branches) appear **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `user-hierarchy.service.ts` ~1675 LOC, mobile `bubbles_Data.tsx` ~4852 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` vs `SecureApiService.ts`; `databaseService.ts` vs `enhancedDatabaseService.ts`) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`).

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump) — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-05)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-04) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| Chat OptionalAuth guest read | Confirmed |
| Rides/CRM/items-delivery/community-members/rate-limit unguarded | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook | Confirmed (values not reproduced here) |
| Tracked data-backups JSON count | 49 |
| Request-path `DROP TABLE … CASCADE` (posts/tasks) | Confirmed |
| Global `APP_GUARD` Throttler | Absent |
| npm audit (3 runs) | 37 → 61 → 89; critical 4 packages |
| Confirmed request-handler SQLi | None new (parameterized queries dominant; DDL/import identifier interpolation remains maintenance risk) |
| XSS (`dangerouslySetInnerHTML` / `eval`) | No production XSS sinks found; `eval` only mentioned in a Sonar-safe comment |

---

# 🛡️ Daily Audit Report: 2026-08-04

**HEAD:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02/03)  
**Scope:** Holistic re-verification of prior critical findings + secret/DDL/auth/npm scans; no new product commits on `dev` since last audit  
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users functional areas  
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–354, `buildResolveSuccessResponse` ~645–672, `linkResolveIdentifiers` ~580–627) → Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 authentication expectations (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` ~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` ~18–32, role/`firebase_uid` updates ~345–361) → Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Client-spoofable hierarchy actors** — File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` ~492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId` ~600–615, ~945–981) → Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **OptionalAuthGuard always allows** — File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (~338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)`). Guest path in `getUserConversations` (~246–269) reads conversations for any `:userId` when unauthenticated → Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** — Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; create accepts body `driver_id` ~47–75; booking status update ~505–569); `crm.controller.ts` (no guards on list/create/delete); `community-members.controller.ts`; `items-delivery.controller.ts` → Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed `driver_id` / ownership fields.

* **Committed secrets and data backups** — Files: `apps/api/railway.toml.dev` (~34 `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 documents a JWT hex); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/`; `apps/mobile/android/app/debug.keystore` tracked → Action: Rotate exposed JWT material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders.

* **Destructive DDL on request/startup paths** — Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`, invoked via `ensurePostsTable` on list/create paths ~842+); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops) → Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** — File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` present; **no** `APP_GUARD` / global `ThrottlerGuard`). Comments in `main.ts` / `app.module.ts` claim global rate limiting, but only Auth + Notifications controllers apply `ThrottlerGuard` → Action: Register global `ThrottlerGuard` per SRS NFR §3.1 (60 req/60s); keep per-route overrides for operator tiers.

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

* **Android network security (positive)** — Recent `network_security_config.xml` sets `cleartextTrafficPermitted="false"` for release builds; debug overlay is separate. No new cleartext production exposure found in this pass.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#117 and subsequent report-only branches through 2026-08-03) appear **unmerged** into `dev`; HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers — orthogonal to authz but increases change risk.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `user-hierarchy.service.ts` ~1675 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump) — remove and gitignore.

* `git diff --check origin/dev...HEAD`: clean (no whitespace errors) at report time.

---

### Verification evidence (2026-08-04)

| Check | Result |
|-------|--------|
| HEAD vs prior audit (2026-08-03) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Hierarchy actor skip-if-omitted | Confirmed |
| Chat OptionalAuth guest read | Confirmed |
| Rides/CRM/items-delivery/community-members unguarded | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook | Confirmed |
| Tracked data-backups JSON count | 49 |
| Request-path `DROP TABLE … CASCADE` (posts/tasks) | Confirmed |
| Global `APP_GUARD` Throttler | Absent |
| npm audit (3 runs) | 37 → 61 → 89; critical 4 packages |
| Confirmed request-handler SQLi | None new (parameterized queries dominant; DDL/import identifier interpolation remains maintenance risk) |
| XSS (`dangerouslySetInnerHTML` / `eval`) | No production XSS sinks found; `eval` only mentioned in a Sonar-safe comment |

---
