# 🛡️ Daily Audit Report: 2026-08-13

**Product HEAD audited:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — identical to `origin/dev` and to the 2026-08-12 audit)
**Audit branch:** `cursor/daily-repository-audit-e366`
**Scope:** Holistic security / bug / architecture / debt re-verification; secret, DDL, auth-guard, XSS/SQLi, npm, and unguarded-controller scans
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth §2.1, users §2.2, rides §2.4, posts §2.5, tasks, chat §2.7 (`docs/SSOT/SRS/functional/*`); backend §5; gaps §10
**Mode:** Report-only (no product code fixes in this pass — blast radius of confirmed issues is multi-module; prior daily-audit PRs #105–#128 have not merged to `dev`)
**Delta vs 2026-08-12:** No product commits. All previously confirmed critical items re-verified at the same line numbers. npm audit totals again non-deterministic (**45 → 95**; critical still **4**). Explicitly restated unauthenticated Redis debug API (`/redis-test` get/set/delete/keys) and unauthenticated `/api/collections` CRUD as first-class critical items.

---

## 🚨 Critical Vulnerabilities

 * **Unauthenticated identifier-only account takeover via `POST /api/users/resolve-id`.** No `JwtAuthGuard`. Supplying a known `email`, `google_id`, or `firebase_uid` looks up `user_profiles`, optionally **links** a caller-supplied `firebase_uid`/`google_id` onto that row, then **mints a full JWT pair** (`accessToken` + `refreshToken`) for that user. Concrete trigger: `POST /api/users/resolve-id` with `{ "email": "<victim>" }` (or a guessed Firebase/Google id) returns tokens with the victim’s `roles`. SRS §2.1.6 currently documents this minting behavior — the spec itself should be tightened to require proof of possession (verified Firebase/Google ID token or existing session), not identifier matching. - File: `apps/api/src/controllers/users.controller.ts` (183–188) → `apps/api/src/services/user-auth.service.ts` (`resolveUserId` 270–342, `linkResolveIdentifiers` 580–627, `buildResolveSuccessResponse` 645–672) -> Action: Remove token minting from resolve-id; require a verified ID token; never link identifiers from an unauthenticated body; bind any remaining resolve helper to `JwtAuthGuard`.

 * **Authenticated privilege escalation via profile mass-assignment.** `PUT /api/users/:id` is JWT-gated but does **not** check `req.user.userId === :id` and accepts `roles`, `firebase_uid`, `parent_manager_id`, and `hierarchy_level` on `UpdateUserBody`. Any logged-in user can promote themselves (or another user) to `admin` / `super_admin` except the hardcoded root-admin email. - File: `apps/api/src/services/user-profile.service.ts` (18–32, 345–361); `apps/api/src/controllers/users.controller.ts` (126–133) -> Action: Strip privileged fields from the DTO; enforce ownership or `AdminAuthGuard`; ignore client-supplied `roles` / `firebase_uid` / hierarchy fields.

 * **Unauthenticated PII dump of all users.** `GET /api/users` and `GET /api/users/:id` (also `GET /api/users/search`) have no guards. List query selects `u.email`; get-by-id selects `email` and `phone`. Violates SRS §3.5 data minimization. - File: `apps/api/src/controllers/users.controller.ts` (40–43, 121–123, 135–149); `apps/api/src/services/user-profile.service.ts` (126–151, 515) -> Action: Require auth; project fields by viewer; never return email/phone to unauthorized callers.

 * **Client-supplied hierarchy actors (privilege escalation).** Hierarchy mutate routes use `JwtAuthGuard` but authorization is based on **body** `requestingAdminId` / `requestingUserId` / `managerId`, not `req.user`. Omitting `requestingUserId` on `setManager` skips the admin check. An attacker with any valid JWT can send another admin’s UUID and promote/demote. Unauthenticated reads: `GET eligible-for-promotion/:adminId`, `GET hierarchy/tree`, `GET :id/hierarchy`. - File: `apps/api/src/controllers/users.controller.ts` (45–108); `apps/api/src/services/user-hierarchy.service.ts` (492–517, 871–914, 945–980) -> Action: Bind actor exclusively to `req.user`; require `AdminAuthGuard` (or volunteer-manager policy) on mutations; authenticate tree/eligible reads.

 * **Spoofable follow graph.** `POST/DELETE /api/users/:id/follow` is JWT-gated but inserts `followData.follower_id` from the body, not `req.user.userId`. Any authenticated user can create or delete follows as any other user. - File: `apps/api/src/services/user-follow.service.ts` (6–8, 19–34); `apps/api/src/controllers/users.controller.ts` (165–180) -> Action: Use `req.user.userId` as follower; ignore body actor ids.

 * **Chat is effectively public.** Class-level `@UseGuards(OptionalAuthGuard)` **always returns `true`** (`jwt-auth.guard.ts:338`). Guest path for conversations uses the URL `userId` (`chat.controller.ts:267–268`). Guest path for messages skips participant checks (`378–387`) and returns conversation messages. Concrete trigger: unauthenticated `GET` of another user’s conversations or any conversation’s messages. - File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (308–339); `apps/api/src/controllers/chat.controller.ts` (46, 250–270, 378–387) -> Action: Require `JwtAuthGuard`; always enforce participant membership from `req.user`.

 * **Rides: no auth; spoofable passenger; unauthenticated booking status.** `rides.controller.ts` has **zero** `@UseGuards`. `POST :id/book` uses body `passenger_id` (email / firebase_uid / UUID). `PUT bookings/:bookingId/status` updates status from the body with no driver/admin check. - File: `apps/api/src/controllers/rides.controller.ts` (37, 374–468, 505–555) -> Action: Add `JwtAuthGuard`; bind passenger to `req.user`; restrict status changes to driver/admin; reject approve when remaining seats would go negative (see Bugs).

 * **Unauthenticated mutating admin/CRM/community/items surfaces.** No `@UseGuards` on: `CrmController` (`/api/crm`), `CommunityMembersController` (`/api/community-members`, includes `contact_info` email/phone), `ItemsDeliveryController` (`/api/items-delivery`, client `owner_id`), `DedicatedItemsController` (`/api/dedicated-items` create/update/delete), `ItemsController` (`/api/collections/:collection` CRUD allowlist includes `users`, `chats`, `messages`, `tasks`, `notifications`, `rides`, `organizations`). Concrete trigger: unauthenticated `POST /api/crm`, `DELETE /api/community-members/:id`, `POST /api/collections/messages/...`. - File: `apps/api/src/controllers/crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `apps/api/src/items/dedicated-items.controller.ts`; `apps/api/src/items/items.controller.ts` + `items.service.ts` (15–36) -> Action: Auth + role/ownership on all mutating routes; lock down or remove generic collections CRUD.

 * **Unauthenticated Redis session/token store access.** `RedisTestController` (`/redis-test`) has no guards. `GET /redis-test/keys?pattern=*`, `GET /redis-test/get/:key`, `POST /redis-test/set`, `DELETE /redis-test/delete/:key` can list, read, overwrite, or delete Redis keys (refresh tokens, sessions, rate-limit, caches). - File: `apps/api/src/controllers/redis-test.controller.ts` (16–124) -> Action: Remove from production builds or gate with `AdminAuthGuard` + non-production env check.

 * **Unauthenticated rate-limit bypass.** `DELETE /rate-limit/clear` (and test/stats/rules/custom/simulate) has no auth. An attacker can clear their own (or any) identifier’s throttle. Combined with missing global `APP_GUARD`, SRS §3.1 “global 60 req/60s via ThrottlerGuard” is not actually enforced. - File: `apps/api/src/controllers/rate-limit.controller.ts` (20–175); `apps/api/src/app.module.ts` (72–77) — `ThrottlerModule.forRoot` present, **no `APP_GUARD` / `ThrottlerGuard` registration anywhere in `apps/api/src`** -> Action: Register global `ThrottlerGuard`; delete or admin-gate the debug controller.

 * **Request-path and startup `DROP TABLE … CASCADE`.** `GET /api/posts` calls `ensurePostsTable()` → `migrateExistingPostsTableColumns`; if `id` or `author_id` is missing, it runs `DROP TABLE IF EXISTS posts CASCADE` on a user request. Task side-effects call `TasksSchemaService.ensurePostsTable()` which drops `posts` when `author_id` is absent. `DatabaseInit.onModuleInit` drops `donations` / `rides` if a legacy JSONB `data` column exists. Concrete trigger: schema drift or a malicious/failed migration that removes a column, then any public GET posts or API boot wipes related tables. - File: `apps/api/src/controllers/posts.controller.ts` (67–78, 176–199, 830–842); `apps/api/src/tasks/tasks-schema.service.ts` (18–41); `apps/api/src/database/database.init.ts` (568, 670) -> Action: Move DDL to versioned migrations; never DROP on a request path; refuse boot on unexpected schema instead of destroying data.

 * **Committed credentials and backups.** Tracked `apps/api/railway.toml.dev` contains a live-format `JWT_SECRET`. Runbook `docs/SSOT/runbooks/api/environment-separation.md:126` embeds a production-labeled `JWT_SECRET` (value not repeated here). 49 JSON files under `apps/api/data-backups/20251224-162421/` are tracked; `user_profiles.json` schema includes `email`, `phone`, `password_hash`. - File: `apps/api/railway.toml.dev:34`; `docs/SSOT/runbooks/api/environment-separation.md:126`; `apps/api/data-backups/20251224-162421/*` -> Action: Rotate all exposed JWT secrets; purge secrets from git history; gitignore backups; use secret managers only.

 * **JWT-gated but unscoped task list.** `GET /api/tasks` uses `JwtAuthGuard` then lists by query filters (`assignee`, `status`, …) with **no** restriction to the caller’s tasks. Any authenticated user can enumerate all tasks (ClosedRoute even queries another profile’s `assignee`). - File: `apps/api/src/tasks/tasks.controller.ts` (74–146) -> Action: Default-scope to `req.user`; require admin for global lists.

 * **Demo session controller still authenticates against real `password_hash`.** `/session/login` is documented as demo/test but verifies production credentials and creates Redis sessions, with no Nest JWT guard on the controller. - File: `apps/api/src/auth/controllers/session.controller.ts` (1–8, 27–79) -> Action: Remove from production module graph.

 * **npm audit (lockfile, non-deterministic registry).** Two consecutive runs at this HEAD: **total 45 then 95**; **critical 4** both times (`handlebars`, `shell-quote`, `tar`, `websocket-driver`); high 24 then 78. Do not treat a single total as stable. - File: workspace `package-lock.json` / workspaces -> Action: Pin/upgrade the four critical transitives; re-run audit in CI with a frozen evidence log.

 * **XSS / SQLi (request path):** No `dangerouslySetInnerHTML`, no runtime `eval(` in `apps/`. Request-path SQL uses `$N` parameters; `pg-format` `%I` is used for allowlisted collection names in `items.service.ts`. Offline scripts interpolate table names (`import-data.ts`, `export-data.ts`). **No new XSS/SQLi issue on the request path.** `BYPASS_AUTH` remains removed (SEC-003.1).

---

## 🐞 Bugs & Logic Issues

 * **Auth refresh waiters hang forever.** `fetchWithAuth` queues concurrent 401s on `refreshSubscribers`. On refresh failure (or success without `accessToken`), the leader sets `isRefreshing = false` and **clears the subscriber array without calling `onRefreshed`**. Waiters’ Promises never resolve. Concrete trigger: two parallel authenticated calls when the access token is expired and refresh fails. - Recommendation: Reject (or replay-fail) all subscribers in the failure path; wrap waiter Promises with a timeout; reset `isRefreshing` in `finally`. File: `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (9–90).

 * **Closed tab task-type inconsistency / possible duplicates.** Posts included in Closed are typed `'task'` with `taskData: p.task`. Later `getTasks` dedupes only `c.type === 'task' && c.taskData?.id`, then **pushes `type: 'task_post'`**. If `p.task` is missing `id`, the Set is empty and the same task appears twice; downstream UI that keys on `'task'` vs `'task_post'` will skip one class of items. - Recommendation: Normalize to one type; dedupe on `task.id` / `taskId` regardless of `type`. File: `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` (100–104, 319–351).

 * **Task `PATCH` to `done` always runs completion-post side effects.** Time-log guard skips when `oldStatus === "done"`, but `runUpdateTaskCompletionPosts` runs whenever `body.status === "done"` even if the task was already done. Repeat PATCH creates duplicate completion posts. - Recommendation: Gate side effects on `oldStatus !== "done"` (and/or unique `(task_id, post_type)`). File: `apps/api/src/tasks/tasks-patch-mutation.service.ts` (32–34 vs 380–382).

 * **Ride approval oversell.** Booking checks remaining seats only for new bookings. `updateBookingStatus` to `approved` never rejects when `remaining_seats < 0` after the update; it only flips the ride to `'full'` when `<= 0`. Concurrent pending bookings can all be approved past capacity. No row lock / `SELECT … FOR UPDATE`. - Recommendation: Re-check capacity inside the same transaction before approve; abort if over; lock the ride row. File: `apps/api/src/controllers/rides.controller.ts` (505–555).

 * **Public unauthenticated `POST /api/donations/knowledge/links`.** Commented as “no admin approval”; any caller can insert community links (spam/phishing). - Recommendation: Auth + rate-limit + moderation queue. File: `apps/api/src/controllers/donations.controller.ts` (226–236).

 * **Places proxy is unauthenticated and bills Google.** `GET /autocomplete` and `/place-details` forward `GOOGLE_API_KEY` server-side (key not returned) but have no auth or quota. - Recommendation: Auth or app-check + per-IP throttle. File: `apps/api/src/controllers/places.controller.ts`.

 * **`SYNC_API_KEY` defaults to `change-me-in-production`.** Sync mutate routes also use `AdminAuthGuard`, so this is not a standalone bypass today, but a missing env var leaves a known default. - Recommendation: Fail closed if unset in production. File: `apps/api/src/controllers/sync.controller.ts` (27–40).

 * **Admin files list/search is any-JWT, not admin.** `GET` / related routes use only `JwtAuthGuard`; upload/delete use `AdminAuthGuard`. - Recommendation: Align all admin-file routes on `AdminAuthGuard`. File: `apps/api/src/controllers/admin-files.controller.ts` (81, 128 vs 143, 203).

 * **Error messages may leak internals.** Several controllers return `error.message` to clients (tasks, dedicated-items, rate-limit, redis-test). Conflicts with `constraints.md` / SRS error-handling. - Recommendation: Map to stable error codes; log details server-side.

---

## 🏗️ Architecture & Clean Code

 * **Target vs actual:** `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` requires Infrastructure → Application → Domain. There are **zero** `/domain`, `/application`, or `/infrastructure` folders under `apps/` or `packages/`. Nest feature folders own HTTP + SQL + cache. Closest pure islands: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`, `tasks.types.ts` (no Nest/`pg` imports). `packages/` still only `config-eslint`.

 * **Fat HTTP+SQL controllers (constraint ~200 LOC):** `posts.controller.ts` 2741 (Pool + Redis + DDL DROP), `stats.controller.ts` 1709, `community-group-challenges.controller.ts` 1097, `donations.controller.ts` 892, `chat.controller.ts` 813, `rides.controller.ts` 779. `items-delivery.service.ts` remains under `controllers/`.

 * **Better-shaped but still infra-in-service:** `users.controller.ts` is thin; services still inject `pg.Pool`. `items/` and `tasks/` split services; `tasks.controller.ts` still injects Pool for schema ensure.

 * **SRS §5 lists `OperatorMatchingModule` as required; it does not exist** (logged in SRS §10.1). `OperatorAuthGuard` exists but is unused by any `/api/operator/*` module. Anonymity column still absent from posts DDL.

 * **ThrottlerModule imported without a guard** — comments in `app.module.ts` claim “global rate limiting enabled”; there is no `APP_GUARD`. Only `AuthController` and `NotificationsController` opt in to `ThrottlerGuard`.

 * **Mobile debt hubs:** `databaseService.ts` 1225, `SecureApiService.ts` 1165, `apiService.ts` 1055, `enhancedDatabaseService.ts` 897. Duplicate HTTP stacks (`apiService` vs `google_auth/SecureApiService`). ~**197** source `.ts`/`.tsx` files in apps+packages exceed 200 LOC (excluding `node_modules`/`dist`).

 * **OptionalAuthGuard name vs behavior:** documented as enriching guests; implementation is “always allow,” which makes class-level use on Chat a security control failure, not merely a layering smell.

---

## 🧹 Technical Debt & Maintenance

 * **Logged in `tech-debt-log.md`:** `databaseService.ts` legacy surface; orphan donation screens; admin tables API without mobile UI; Maestro E2E in CI; production APM. **Not logged as named bugs:** resolve-id token minting, mass-assignment, unauthenticated PII, hierarchy/rides/chat actor spoofing, Redis-test/rate-limit debug APIs, request-path DROP TABLE, auth refresh waiter hang, ClosedRoute type mismatch, task completion-post duplicates, ride oversell, missing CA folders, SecureApiService duplication, fat controllers.

 * **SRS §10 still accurate:** no operator matching module/tables/screens; no `anonymity_level`; events/orgs schema without API; custom HMAC JWT; no global exception filter; almost no API/mobile unit tests; dual notification tables.

 * **Hardcoded product email** `karmacommunity2.0@gmail.com` in `user-profile.service.ts` for special-case redaction (SRS says admin access is role-based only — this is a leftover identity check).

 * **Hebrew in API error strings** (task hours-log message, hierarchy errors) vs English-only code/docs convention.

 * **Public knowledge-link POST**, unauthenticated Places proxy, and `/session` demo controller should not ship in production builds.

 * **Prior daily-audit PRs (#105–#128) remain unmerged** as of this run; repeating the same product HEAD means these findings will recur until a dedicated hardening PR is scheduled.

---

*Verification (2026-08-13 UTC): `git rev-parse HEAD` = `origin/dev` = `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040`; `git diff --check origin/dev...HEAD` clean; `npm audit --workspaces` metadata.vulnerabilities.total **45 then 95**, critical **4**; no `APP_GUARD` matches; `DROP TABLE` on request/startup paths confirmed; OptionalAuthGuard `return true` confirmed; resolve-id JWT mint confirmed. Report-only — no executable code changes.*

---

# 🛡️ Daily Audit Report: 2026-08-12

**Product HEAD audited:** `3d92f9d9cfbf7fa4e02b763eeb62a131d494f040` (merge #101 — unchanged since 2026-08-02; identical to 2026-08-11 audit)
**Audit branch:** `cursor/daily-repository-audit-dc1b`
**Scope:** Holistic security / bug / architecture / debt re-verification; secret, DDL, auth-guard, XSS/SQLi, and npm scans
**SRS mapping:** NFR §3.1–3.2 (`docs/SSOT/SRS/03-non-functional-requirements.md`); auth/users/rides/tasks/chat (`docs/SSOT/SRS/functional/*`)
**Mode:** Report-only (no product code fixes in this pass)

## 🚨 Critical Vulnerabilities

* **Unauthenticated JWT minting via `/api/users/resolve-id`** - File: `apps/api/src/controllers/users.controller.ts` (183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` 270–342, `linkResolveIdentifiers` 580–627, `buildResolveSuccessResponse` 645–672) -> Action: Require a verified Firebase/Google ID token (or equivalent proof) before resolution, linking, or token issuance; never mint tokens from identifier-only body fields (`email` / `firebase_uid` / `google_id`). Conflicts with SRS NFR §3.2 (SRS §2.1.6 documents current identifier-only behavior — gap vs NFR).

* **Profile privilege / identity mass-assignment** - File: `apps/api/src/controllers/users.controller.ts` (`PUT :id` 126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` 18–32, role/`firebase_uid` writes 345–361) -> Action: Enforce ownership or admin role from JWT (not path param alone); strip `roles`, `firebase_uid`, `hierarchy_level`, `parent_manager_id` from client-writable fields unless elevated auth is verified server-side.

* **Unauthenticated user list / profile read (PII enumeration)** - File: `apps/api/src/controllers/users.controller.ts` (`GET :id` 121–123, `GET /` 135–149) — no `@UseGuards` -> Action: Require JWT (and ownership/admin for sensitive fields) before returning user profiles or searchable user directories.

* **Client-spoofable hierarchy actors** - File: `apps/api/src/services/user-hierarchy.service.ts` (`setManagerEnsureRequesterAdminIfProvided` 492–517 skips check when `requestingUserId` omitted; body-supplied `requestingAdminId` / `requestingUserId`; `manageHierarchy` trusts body `managerId` 871–914; `promoteToAdmin` 945–980) -> Action: Derive actor exclusively from authenticated JWT; reject missing actor; never trust body IDs for authorization.

* **Unauthenticated hierarchy disclosure** - File: `apps/api/src/controllers/users.controller.ts` (`GET eligible-for-promotion/:adminId` 91–93, `GET hierarchy/tree` 96–98, `GET :id/hierarchy` 106–108) — no `@UseGuards` -> Action: Require JWT + admin/operator role before returning promotion candidates or org tree.

* **OptionalAuthGuard always allows (chat guest IDOR)** - File: `apps/api/src/auth/guards/jwt-auth.guard.ts` (338 `return true`) used by `apps/api/src/controllers/chat.controller.ts` (class `@UseGuards(OptionalAuthGuard)` ~46). Guest conversation/message paths authorize by path/`conversationId` alone when unauthenticated (~267–268, ~378–387) -> Action: Require JWT for private chat/conversation data; keep OptionalAuth only for truly public read surfaces.

* **Unguarded mutation / listing surfaces** - Files: `apps/api/src/controllers/rides.controller.ts` (no `UseGuards`; booking accepts body `passenger_id` ~374–468; booking status update ~505–555); `crm.controller.ts`; `community-members.controller.ts`; `items-delivery.controller.ts`; `rate-limit.controller.ts` (includes unauthenticated clear) -> Action: Apply `JwtAuthGuard` / `AdminAuthGuard` per SRS; bind actor IDs from token; reject spoofed passenger/driver/ownership fields; lock rate-limit admin surface to operators only.

* **Committed secrets and data backups** - Files: `apps/api/railway.toml.dev` (~34 hardcoded `JWT_SECRET`); `docs/SSOT/runbooks/api/environment-separation.md` (~126 production-looking JWT; ~102 placeholder); `docs/SSOT/runbooks/api/test-redis-production.md` (Redis/Postgres password fragments); **49** tracked JSON backups under `apps/api/data-backups/20251224-162421/` (includes `user_profiles` with email/phone/`password_hash` keys); `apps/mobile/android/app/debug.keystore` tracked -> Action: Rotate exposed JWT/Redis material; remove secrets from git history/config; use env/secret managers only; purge or gitignore backups and keystores; scrub runbook examples to placeholders. (Secret values intentionally omitted from this report.)

* **Destructive DDL on request/startup paths** - Files: `apps/api/src/controllers/posts.controller.ts` (`DROP TABLE IF EXISTS posts CASCADE` ~78 inside `migrateExistingPostsTableColumns`, invoked via `ensurePostsTable` on request paths); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (donations/rides drops ~568, ~670) -> Action: Move schema changes to versioned migrations only; never `DROP … CASCADE` from HTTP handlers or opportunistic ensure-* helpers.

* **ThrottlerModule without global enforcement** - File: `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot` 72–77; **no** `APP_GUARD` / global `ThrottlerGuard`). Only Auth + Notifications controllers apply `ThrottlerGuard` -> Action: Register global `ThrottlerGuard` per SRS NFR §3.1; keep per-route overrides for operator tiers.

* **npm audit critical transitive deps (non-deterministic totals)** - Evidence at audit time (three consecutive runs): **95 → 96 → 96** total advisories; **critical count stable at 4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver` -> Action: Pin/upgrade resolving parents; re-check after lockfile changes; report observed range/max rather than a single count. Historical observed range for this lockfile remains roughly **45–96** with the same critical set — treat registry totals as volatile.

## 🐞 Bugs & Logic Issues

* **Ride booking approval can oversell seats** - `apps/api/src/controllers/rides.controller.ts` `updateBookingStatus` (~505–569) sets status to `approved` then only marks ride `full` when remaining ≤ 0; no capacity reject / row lock (`FOR UPDATE`) before approve. Recommendation: In one transaction, lock ride + sum approved seats; reject approve when `seats_requested` would exceed `available_seats`.

* **`GET /api/tasks` returns unscoped task lists for any JWT** - `apps/api/src/tasks/tasks.controller.ts` (~74–146) is auth-gated (`JwtAuthGuard`) but lists with optional filters only; no default assignee/community scope. Recommendation: Default-scope to caller (or role-based visibility) per product SRS; never return global task inventory to arbitrary authenticated users.

* **Task done PATCH can create duplicate completion posts** - `apps/api/src/tasks/tasks-patch-mutation.service.ts` (~380–382) calls completion side effects whenever `body.status === "done"` without requiring a transition from a non-done status; `finalizePerformerCompletionPost` INSERTs a new `task_completion` post when no matching assignment row is updated (`tasks-side-effects.service.ts` ~447–477). Controller loads `oldStatus` but does not pass it into the mutation. Recommendation: Gate completion side effects on `oldStatus !== "done"`; add idempotent unique constraint / upsert for completion posts.

* **Auth refresh waiters hang on failure** - `apps/mobile/auth/interceptors/authFetchInterceptor.ts` (~75–89): failed refresh clears `refreshSubscribers` without resolving waiters subscribed via `subscribeTokenRefresh`. Recommendation: Reject/resolve all subscribers on failure paths before clearing tokens.

* **ClosedRoute task type inconsistency** - `apps/mobile/bottomBarScreens/profile/ClosedRoute.tsx` filters existing content with `type === 'task'` (~324) but pushes `type: 'task_post'` (~351), so duplicate suppression against post-derived tasks is ineffective. Recommendation: Align filter and push types (or normalize via a single type constant matching `FeedItem.type`).

## 🏗️ Architecture & Clean Code

* **No Domain / Application layer packages in `apps/*` or `packages/*`** - Target in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` is Infrastructure → Application → Domain; current Nest controllers (`posts`, `rides`, `crm`, `items-delivery`, etc.) inject `Pool` and embed SQL + auth decisions directly. Closest pure helpers: `apps/api/src/tasks/task-completion-participants.ts`, `tasks-validation.ts`, `tasks-query-params.ts`, `tasks.types.ts`.

* **Schema ownership in controllers** - Posts/tasks “ensure table” helpers with DDL (including DROP) inside request-serving classes violate migration/infrastructure boundaries and create production data-loss risk.

* **Authorization as client-supplied parameters** - Hierarchy and rides trust body/path actors instead of JWT-derived identity; this is an architectural authz anti-pattern, not only a bug.

* **SRS vs implementation gap** - Identifier-only `resolve-id` is reflected in functional SRS §2.1.6 while NFR §3.2 requires verified tokens; keep gap logged under `docs/SSOT/SRS/10-gaps-and-assumptions.md` until product decides which wins (prefer NFR for security).

* **XSS / classic SQLi (scan notes)** - No `dangerouslySetInnerHTML` / runtime `eval(` under `apps/` (comment-only mention of avoiding eval in a mobile script). API request query paths remain parameterized (`$1`…); script-only table-name interpolation exists in offline import/export helpers. High-risk pattern remains dynamic DDL and authz bypasses rather than classic string-concat SQLi in hot HTTP paths.

## 🧹 Technical Debt & Maintenance

* Prior daily-audit PRs (#105–#127 and related report-only branches) remain **unmerged** into `dev`; product HEAD still `3d92f9d` (merge #101) — findings persist day-over-day with no remediation commits.

* `docs/SSOT/CODE_QUALITY/tech-debt-log.md` still tracks large legacy surfaces (`databaseService.ts`, Maestro CI, APM) and orphan donation wrappers. Auth refresh hang, ClosedRoute types, task completion duplicates, and ride oversell are **not** yet logged there by name.

* Controllers exceeding complexity caps (`posts.controller.ts` ~2741 LOC, `stats.controller.ts` ~1709 LOC, `community-group-challenges.controller.ts` ~1097 LOC, `donations.controller.ts` ~892 LOC, `chat.controller.ts` ~813 LOC, `rides.controller.ts` ~779 LOC) — split toward ~200 LOC/file per `constraints.md` when fixing authz (do not boil the ocean in one PR).

* Duplicate API clients on mobile (`apiService.ts` ~1055 LOC vs `SecureApiService.ts` ~1165 LOC; `databaseService.ts` ~1225 LOC vs `enhancedDatabaseService.ts` ~897 LOC) and duplicate feed mappers (`mapPostToFeedItem*` vs `useFeedData`). ~**197** TypeScript source files exceed the ~200 LOC guideline.

* Snyk integration removed (commit `8e31e78`); rely on `npm audit`, Sonar tooling under `tools/quality/sonar`, and this daily audit until a replacement OSS/SCA gate is chosen.

* Accidental commit artifacts still tracked: `apps/mobile/tsc_output.txt` (TypeScript dump); `apps/mobile/android/app/debug.keystore` — remove and gitignore.

* `git diff --check` against product tree at `3d92f9d`: clean for app sources; prior report history lines may contain trailing spaces inherited from earlier audit branches.

---

### Verification evidence (2026-08-12)

| Check | Result |
|-------|--------|
| Product HEAD vs prior audit (2026-08-11) | Identical `3d92f9d` |
| `resolve-id` unauthenticated + JWT mint | Confirmed |
| Profile `roles` / `firebase_uid` writable | Confirmed |
| Unauthenticated `GET /api/users` + `GET :id` | Confirmed |
| Hierarchy actor skip-if-omitted + body `managerId` | Confirmed |
| Hierarchy tree / eligible-for-promotion unauthenticated | Confirmed |
| OptionalAuthGuard always-true + chat guest conversations | Confirmed |
| Rides unguarded + passenger_id spoof + approve oversell | Confirmed |
| DROP TABLE on posts ensure path / tasks-schema / DatabaseInit | Confirmed |
| Committed JWT in `railway.toml.dev` + runbook + 49 backups | Confirmed |
| ThrottlerModule without `APP_GUARD` | Confirmed |
| npm audit (three runs) | 95 → 96 → 96 total; critical 4 (`handlebars`, `shell-quote`, `tar`, `websocket-driver`) |
| ClosedRoute `task` vs `task_post` mismatch | Confirmed |
| Auth refresh waiter hang on failure | Confirmed |
| Domain/Application folders under apps/packages | Absent |
| CRM / community-members / items-delivery / rate-limit | No `@UseGuards` on controllers |
| XSS patterns (`dangerouslySetInnerHTML` / runtime `eval`) | None found under `apps/` |
| Files >200 LOC (apps+packages sources) | ~197 |

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
