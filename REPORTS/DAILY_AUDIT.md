# 🛡️ Daily Audit Report: 2026-08-02

**HEAD:** `3d92f9d` (same as `origin/dev`; no application code merged since prior audit window)

**Evidence timestamp:** `2026-08-02T06:01:11Z`

**Scope:** Holistic deep-scan of `apps/api`, `apps/mobile`, committed config/docs/backups; re-verification of the persistent critical cluster. Prior daily-audit PRs (#105–#117) remain **OPEN / DRAFT / unmerged**, so `REPORTS/` and SSOT gap rows from those runs are not on `dev` yet — this report re-records them.

**npm audit (workspaces, observed range this run):** consecutive passes **37** (critical **4**, high **19**) → **61** (critical **4**, high **46**) → final HEAD **89** (critical **4**, high **74**). Registry remains non-deterministic for this lockfile — report max/range, not a single stable count. Critical packages: `handlebars`, `shell-quote`, `tar`, `websocket-driver`.

## 🚨 Critical Vulnerabilities

* **Identifier-only account takeover via `POST /api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342; link without token ~580–627; mint JWT ~645–672) -> Action: Require possession proof (Firebase ID token / Google ID token / password). Never mint JWT from bare `email` / `firebase_uid` / `google_id`. Align §2.1.6 with §3.2 or deprecate the endpoint.
* **Privilege escalation via profile mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` allows `roles`/`firebase_uid` ~18–32; applied ~345–361) -> Action: Enforce `:id === req.user.userId` (or admin). Strip `roles`, `firebase_uid`, and hierarchy fields from client `UpdateUserBody`; allow role changes only through guarded admin/hierarchy flows.
* **Client-spoofable hierarchy / admin actors** — File: `apps/api/src/controllers/users.controller.ts` (hierarchy endpoints ~45–88), `apps/api/src/services/user-hierarchy.service.ts` (promote/demote/`setManager`; omit requester skips check ~492–517) -> Action: Derive acting principal exclusively from JWT (`req.user`). Reject body-supplied `requestingAdminId` / `requestingUserId` as authority.
* **Unauthenticated or optionally-authenticated mutation / read surfaces** — Files: `apps/api/src/auth/guards/jwt-auth.guard.ts` (`OptionalAuthGuard` always returns `true` ~338); chat guest reads (`chat.controller.ts` ~246–269, ~341–388); unguarded controllers: rides, items-delivery, CRM, community-members, session, rate-limit -> Action: Require `JwtAuthGuard` (or stricter) on all mutating routes; scope rate-limit admin ops to `AdminAuthGuard`; enforce participant checks on chat reads even when guest.
* **Committed secrets and credentialed backups in git** — Files: `apps/api/railway.toml.dev` (`JWT_SECRET` ~34); `docs/SSOT/runbooks/api/environment-separation.md` (JWT hex ~126); Redis/DB credential material in runbooks (`test-redis-production.md`, `redis-status-summary.md`); **49** tracked JSON dumps under `apps/api/data-backups/20251224-162421/` (emails, phones, password hashes, Google IDs, messages) -> Action: Rotate all exposed secrets immediately; purge backups/secrets from history; use env/secret managers only; add pre-commit secret scanning.
* **Request/startup-path destructive DDL (`DROP TABLE ... CASCADE`)** — Files: `apps/api/src/controllers/posts.controller.ts` (~78, ~309, ~373–374; triggered via `ensurePostsTable` on read/write paths); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (~568, ~670) -> Action: Remove DROP from request handlers entirely; gate startup DDL behind explicit migration tooling with environment checks; never auto-drop production tables for “schema repair”.

## 🐞 Bugs & Logic Issues

* **Ride booking / approval oversell race** — `updateBookingStatus` sets `approved` before capacity re-check and only marks the ride `full` afterward (`apps/api/src/controllers/rides.controller.ts` ~514–555); no `FOR UPDATE` / rejection when seats go negative. Recommendation: `SELECT … FOR UPDATE` on the ride row (or atomic conditional update) inside a transaction before approving; reject when seats insufficient.
* **Task done PATCH creates duplicate completion posts** — `applyUpdateTaskMutation` re-runs completion side effects whenever `body.status === "done"` without requiring a status transition (`tasks-patch-mutation.service.ts` ~380; `tasks-side-effects.service.ts` ~441+). Recommendation: Transition guard (`WHERE status <> 'done'`) + idempotent completion side effects (unique constraint / upsert).
* **Unscoped `GET /api/tasks` for any JWT** — List path never scopes by assignee/creator/role (`tasks.controller.ts` ~74–146; `tasks-list-query.service.ts`). Recommendation: Default to caller-visible tasks; require admin for global list.
* **Spoofable social / ride actors** — Like/comment trust body `user_id`; unguarded ride create/book trust client `driver_id` / `passenger_id` (`posts.controller.ts`, `rides.controller.ts`). Recommendation: Bind actor to `req.user.userId` only.
* **ThrottlerModule without global `APP_GUARD`** — Configured in `app.module.ts` (~72–77) but only applied locally on auth/notifications; public surfaces like `resolve-id` remain unthrottled. Recommendation: Register global `ThrottlerGuard` (with per-route overrides).
* **Auth refresh waiters hang on failure (mobile)** — Concurrent 401 refresh subscribers never settle when refresh fails (`apps/mobile/auth/interceptors/authFetchInterceptor.ts` ~75–89 clears the queue without notifying waiters). Recommendation: Reject all waiters in `finally`/error path before clearing the queue.
* **ClosedRoute task type inconsistency** — API-mapped closed tasks set `type = 'task'` (~104) while completion UI path expects `task_post` + `task_completion` (`ClosedRoute.tsx` ~99–105 vs ~328–352). Recommendation: Normalize feed item types at the mapper boundary.
* **Error-detail leakage to clients** — Some controllers return raw `error.message` (e.g. `challenges.controller.ts`, `stats.controller.ts`). Recommendation: Map to stable client-safe error codes; never leak internals.

## 🏗️ Architecture & Clean Code

* **Clean Architecture layers largely absent** — No `/domain` or `/application` packages under the monorepo (`packages/` only has `config-eslint`); target documented in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` but `apps/api` remains Nest controllers/services with direct `pg` / Redis usage.
* **Infrastructure mixed into HTTP edge** — Controllers perform schema repair (`DROP TABLE`), capacity logic, and authorization using body-supplied identities instead of application use-cases + ports. This blocks consistent authz and testing.
* **SRS vs security NFR conflict** — Functional §2.1.6 documents `resolve-id` minting JWTs from identifiers and creating users if missing, which conflicts with §3.2 authentication/authorization expectations. Prefer §3.2 for security posture; update §2.1.6 and close the gap in `10-gaps-and-assumptions.md` (re-recorded this run — prior audit PRs still unmerged).
* **Inconsistent guard strategy** — Mix of `JwtAuthGuard`, `AdminAuthGuard`, `OptionalAuthGuard`, and completely unguarded mutation routes across adjacent modules (rides/items/CRM vs users/tasks).

## 🧹 Technical Debt & Maintenance

* **Oversized critical files** (well above ~200 LOC guidance): `posts.controller.ts` (~2741), `stats.controller.ts` (~1709), `database.init.ts` (~1374), `databaseService.ts` (mobile ~1225), `community-group-challenges.controller.ts` (~1097), `donations.controller.ts` (~892), `chat.controller.ts` (~813), `rides.controller.ts` (~779).
* **Duplicate user-resolution helpers** despite `user-resolution.service.ts` — also local resolvers in community-members, rides, dedicated-items.
* **Committed `data-backups/` PII** should be removed from the repo and added to `.gitignore`.
* **Dependency risk:** npm audit critical set unchanged (`handlebars`, `shell-quote`, `tar`, `websocket-driver`); high-severity count fluctuated **19 → 46 → 74** across consecutive runs (total **37–89**) — track upgrades for Nest/Expo transitive trees.
* **Deferred hardening** logged in `docs/SSOT/CODE_QUALITY/tech-debt-log.md` (authz hardening program, DDL removal, backup purge, domain layering) — out of scope for this report-only PR.
* **Sync API-key insecure default** — `sync.controller.ts` uses sentinel `change-me-in-production` that disables the extra API-key check when unset (endpoints still use `AdminAuthGuard`). Harden default to fail-closed.

### Prior-day continuity

Previous daily audits (2026-07-16 PR #110, 2026-07-24 PR #111, 2026-07-27 PR #112, 2026-07-28 PR #113, 2026-07-29 PR #114, 2026-07-30 PR #115, 2026-07-31 PR #116, 2026-08-01 PR #117) reported the same critical cluster; **application HEAD has not moved** (`3d92f9d`). No critical findings from those runs appear remediated on `dev`.

---

# 🛡️ Daily Audit Report: 2026-08-01

**HEAD:** `3d92f9d` (same as `origin/dev`; no application code merged since prior audit window)

**Evidence timestamp:** `2026-08-01T06:03:12Z`

**Scope:** Holistic deep-scan of `apps/api`, `apps/mobile`, committed config/docs/backups; re-verification of the persistent critical cluster. Prior daily-audit PRs (#105–#116) remain **OPEN / DRAFT / unmerged**, so `REPORTS/` and SSOT gap rows from those runs are not on `dev` yet — this report re-records them.

**npm audit (workspaces, observed range this run):** consecutive passes **37** (critical **4**, high **19**) → **61** (critical **4**, high **46**) → final HEAD **89** (critical **4**, high **74**). Registry remains non-deterministic for this lockfile — report max/range, not a single stable count. Critical packages: `handlebars`, `shell-quote`, `tar`, `websocket-driver`.

## 🚨 Critical Vulnerabilities

* **Identifier-only account takeover via `POST /api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`resolveUserId` ~270–342; link without token ~580–627; mint JWT ~645–672) -> Action: Require possession proof (Firebase ID token / Google ID token / password). Never mint JWT from bare `email` / `firebase_uid` / `google_id`. Align §2.1.6 with §3.2 or deprecate the endpoint.
* **Privilege escalation via profile mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (~126–133), `apps/api/src/services/user-profile.service.ts` (`UpdateUserBody` allows `roles`/`firebase_uid` ~18–32; applied ~345–361) -> Action: Enforce `:id === req.user.userId` (or admin). Strip `roles`, `firebase_uid`, and hierarchy fields from client `UpdateUserBody`; allow role changes only through guarded admin/hierarchy flows.
* **Client-spoofable hierarchy / admin actors** — File: `apps/api/src/controllers/users.controller.ts` (hierarchy endpoints ~45–88), `apps/api/src/services/user-hierarchy.service.ts` (promote/demote/`setManager`; omit requester skips check ~492–517) -> Action: Derive acting principal exclusively from JWT (`req.user`). Reject body-supplied `requestingAdminId` / `requestingUserId` as authority.
* **Unauthenticated or optionally-authenticated mutation / read surfaces** — Files: `apps/api/src/auth/guards/jwt-auth.guard.ts` (`OptionalAuthGuard` always returns `true` ~338); chat guest reads (`chat.controller.ts` ~246–269, ~341–388); unguarded controllers: rides, items-delivery, CRM, community-members, session, rate-limit -> Action: Require `JwtAuthGuard` (or stricter) on all mutating routes; scope rate-limit admin ops to `AdminAuthGuard`; enforce participant checks on chat reads even when guest.
* **Committed secrets and credentialed backups in git** — Files: `apps/api/railway.toml.dev` (`JWT_SECRET` ~34); `docs/SSOT/runbooks/api/environment-separation.md` (JWT hex ~126); Redis/DB credential material in runbooks (`test-redis-production.md`, `redis-status-summary.md`); **49** tracked JSON dumps under `apps/api/data-backups/20251224-162421/` (emails, phones, password hashes, Google IDs, messages) -> Action: Rotate all exposed secrets immediately; purge backups/secrets from history; use env/secret managers only; add pre-commit secret scanning.
* **Request/startup-path destructive DDL (`DROP TABLE ... CASCADE`)** — Files: `apps/api/src/controllers/posts.controller.ts` (~78, ~309, ~373–374; triggered via `ensurePostsTable` on read/write paths); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (~568, ~670) -> Action: Remove DROP from request handlers entirely; gate startup DDL behind explicit migration tooling with environment checks; never auto-drop production tables for “schema repair”.

## 🐞 Bugs & Logic Issues

* **Ride booking / approval oversell race** — `updateBookingStatus` sets `approved` before capacity re-check and only marks the ride `full` afterward (`apps/api/src/controllers/rides.controller.ts` ~514–555); no `FOR UPDATE` / rejection when seats go negative. Recommendation: `SELECT … FOR UPDATE` on the ride row (or atomic conditional update) inside a transaction before approving; reject when seats insufficient.
* **Task done PATCH creates duplicate completion posts** — `applyUpdateTaskMutation` re-runs completion side effects whenever `body.status === "done"` without requiring a status transition (`tasks-patch-mutation.service.ts` ~380; `tasks-side-effects.service.ts` ~441+). Recommendation: Transition guard (`WHERE status <> 'done'`) + idempotent completion side effects (unique constraint / upsert).
* **Unscoped `GET /api/tasks` for any JWT** — List path never scopes by assignee/creator/role (`tasks.controller.ts` ~74–146; `tasks-list-query.service.ts`). Recommendation: Default to caller-visible tasks; require admin for global list.
* **Spoofable social / ride actors** — Like/comment trust body `user_id`; unguarded ride create/book trust client `driver_id` / `passenger_id` (`posts.controller.ts`, `rides.controller.ts`). Recommendation: Bind actor to `req.user.userId` only.
* **ThrottlerModule without global `APP_GUARD`** — Configured in `app.module.ts` (~72–77) but only applied locally on auth/notifications; public surfaces like `resolve-id` remain unthrottled. Recommendation: Register global `ThrottlerGuard` (with per-route overrides).
* **Auth refresh waiters hang on failure (mobile)** — Concurrent 401 refresh subscribers never settle when refresh fails (`apps/mobile/auth/interceptors/authFetchInterceptor.ts` ~75–89 clears the queue without notifying waiters). Recommendation: Reject all waiters in `finally`/error path before clearing the queue.
* **ClosedRoute task type inconsistency** — API-mapped closed tasks set `type = 'task'` (~104) while completion UI path expects `task_post` + `task_completion` (`ClosedRoute.tsx` ~99–105 vs ~328–352). Recommendation: Normalize feed item types at the mapper boundary.
* **Error-detail leakage to clients** — Some controllers return raw `error.message` (e.g. `challenges.controller.ts`, `stats.controller.ts`). Recommendation: Map to stable client-safe error codes; never leak internals.

## 🏗️ Architecture & Clean Code

* **Clean Architecture layers largely absent** — No `/domain` or `/application` packages under the monorepo (`packages/` only has `config-eslint`); target documented in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` but `apps/api` remains Nest controllers/services with direct `pg` / Redis usage.
* **Infrastructure mixed into HTTP edge** — Controllers perform schema repair (`DROP TABLE`), capacity logic, and authorization using body-supplied identities instead of application use-cases + ports. This blocks consistent authz and testing.
* **SRS vs security NFR conflict** — Functional §2.1.6 documents `resolve-id` minting JWTs from identifiers and creating users if missing, which conflicts with §3.2 authentication/authorization expectations. Prefer §3.2 for security posture; update §2.1.6 and close the gap in `10-gaps-and-assumptions.md` (re-recorded this run — prior audit PRs still unmerged).
* **Inconsistent guard strategy** — Mix of `JwtAuthGuard`, `AdminAuthGuard`, `OptionalAuthGuard`, and completely unguarded mutation routes across adjacent modules (rides/items/CRM vs users/tasks).

## 🧹 Technical Debt & Maintenance

* **Oversized critical files** (well above ~200 LOC guidance): `posts.controller.ts` (~2741), `stats.controller.ts` (~1709), `database.init.ts` (~1374), `databaseService.ts` (mobile ~1225), `community-group-challenges.controller.ts` (~1097), `donations.controller.ts` (~892), `chat.controller.ts` (~813), `rides.controller.ts` (~779).
* **Duplicate user-resolution helpers** despite `user-resolution.service.ts` — also local resolvers in community-members, rides, dedicated-items.
* **Committed `data-backups/` PII** should be removed from the repo and added to `.gitignore`.
* **Dependency risk:** npm audit critical set unchanged (`handlebars`, `shell-quote`, `tar`, `websocket-driver`); high-severity count fluctuated **19 → 46 → 74** across consecutive runs (total **37–89**) — track upgrades for Nest/Expo transitive trees.
* **Deferred hardening** logged in `docs/SSOT/CODE_QUALITY/tech-debt-log.md` (authz hardening program, DDL removal, backup purge, domain layering) — out of scope for this report-only PR.
* **Sync API-key insecure default** — `sync.controller.ts` uses sentinel `change-me-in-production` that disables the extra API-key check when unset (endpoints still use `AdminAuthGuard`). Harden default to fail-closed.

### Prior-day continuity

Previous daily audits (2026-07-16 PR #110, 2026-07-24 PR #111, 2026-07-27 PR #112, 2026-07-28 PR #113, 2026-07-29 PR #114, 2026-07-30 PR #115, 2026-07-31 PR #116) reported the same critical cluster; **application HEAD has not moved** (`3d92f9d`). No critical findings from those runs appear remediated on `dev`.

---

# 🛡️ Daily Audit Report: 2026-07-31 (and earlier)

**HEAD:** `3d92f9d` (same as `origin/dev`)

**Status:** Findings unchanged through 2026-07-31 / 2026-07-30 audits; see 2026-08-02 / 2026-08-01 reports above for full re-verification. Prior PRs #105–#116 remain OPEN / DRAFT / unmerged.

**npm audit (observed historically):** **37 → 61 → 89** (critical **4**: `handlebars`, `shell-quote`, `tar`, `websocket-driver`).

Critical cluster summary (unchanged): `resolve-id` JWT minting; profile/hierarchy mass-assignment; unguarded mutation surfaces; committed JWT secrets + 49 data backups; request/startup `DROP TABLE … CASCADE`; ride oversell race; task duplicate completion; spoofable actors; mobile refresh waiter hang; absent Clean Architecture layers.
