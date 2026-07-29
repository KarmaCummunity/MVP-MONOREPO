# 🛡️ Daily Audit Report: 2026-07-29

**HEAD:** `3d92f9d` (same as `origin/dev`; no application code merged since prior audit window)

**Evidence timestamp:** `2026-07-29T06:01:41Z`

**Scope:** Holistic deep-scan of `apps/api`, `apps/mobile`, committed config/docs/backups; re-verification of the persistent critical cluster. Prior daily-audit PRs (#105–#113) remain **OPEN / unmerged**, so `REPORTS/` and SSOT gap rows from those runs are not on `dev` yet — this report re-records them.

**npm audit (workspaces, observed range this run):** consecutive passes **37** (critical **4**, high **19**) → **61** (critical **4**, high **46**) → final HEAD **89** (critical **4**, high **74**). Registry remains non-deterministic for this lockfile — report max/range, not a single stable count. Critical packages: `handlebars`, `shell-quote`, `tar`, `websocket-driver`.

## 🚨 Critical Vulnerabilities

* **Identifier-only account takeover via `POST /api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`buildResolveSuccessResponse` ~645–661) -> Action: Require possession proof (Firebase ID token / Google ID token / password). Never mint JWT from bare `email` / `firebase_uid` / `google_id`. Align §2.1.6 with §3.2 or deprecate the endpoint.
* **Privilege escalation via profile mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (~126–133), `apps/api/src/services/user-profile.service.ts` (~254–361) -> Action: Enforce `:id === req.user.userId` (or admin). Strip `roles`, `firebase_uid`, and hierarchy fields from client `UpdateUserBody`; allow role changes only through guarded admin/hierarchy flows.
* **Client-spoofable hierarchy / admin actors** — File: `apps/api/src/controllers/users.controller.ts` (hierarchy endpoints ~45–88), `apps/api/src/services/user-hierarchy.service.ts` (promote/demote/`setManager`) -> Action: Derive acting principal exclusively from JWT (`req.user`). Reject body-supplied `requestingAdminId` / `requestingUserId` / `managerId` as authority.
* **Unauthenticated or optionally-authenticated mutation surfaces** — Files: `apps/api/src/auth/guards/jwt-auth.guard.ts` (`OptionalAuthGuard` always returns `true` ~338); unguarded / optional-guard writes on chat (`OptionalAuthGuard`), rides, items-delivery, CRM, community-members, sessions, rate-limit controllers (no `UseGuards` on mutation routes) -> Action: Require `JwtAuthGuard` (or stricter) on all mutating routes; scope rate-limit admin ops to `AdminAuthGuard`; treat guest chat as read-only per product policy.
* **Committed secrets and credentialed backups in git** — Files: `apps/api/railway.toml.dev` (`JWT_SECRET` ~34); `docs/SSOT/runbooks/api/environment-separation.md` (JWT hex ~126); **49** JSON dumps under `apps/api/data-backups/20251224-162421/` (emails, phones, password hashes, Google IDs) -> Action: Rotate all exposed secrets immediately; purge backups/secrets from history; use env/secret managers only; add pre-commit secret scanning.
* **Request/startup-path destructive DDL (`DROP TABLE ... CASCADE`)** — Files: `apps/api/src/controllers/posts.controller.ts` (~78, ~309, ~373–374); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (~568, ~670) -> Action: Remove DROP from request handlers entirely; gate startup DDL behind explicit migration tooling with environment checks; never auto-drop production tables for “schema repair”.

## 🐞 Bugs & Logic Issues

* **Ride booking / approval oversell race** — `bookRide` checks `remaining_seats` without `FOR UPDATE`; `updateBookingStatus` sets `approved` before capacity re-check and only marks the ride `full` afterward (`apps/api/src/controllers/rides.controller.ts` ~374–555). Concurrent approvals can exceed `available_seats`. Recommendation: `SELECT … FOR UPDATE` on the ride row (or atomic conditional update) inside a transaction before approving.
* **Task done PATCH creates duplicate completion posts** — `applyUpdateTaskMutation` re-runs completion side effects whenever `body.status === "done"` without requiring a status transition (`tasks-patch-mutation.service.ts` ~380). Recommendation: Transition guard (`WHERE status <> 'done'`) + idempotent completion side effects (unique constraint / upsert).
* **Unscoped `GET /api/tasks` for any JWT** — List path never scopes by assignee/creator/role (`tasks.controller.ts`; `tasks-list-query.service.ts`). Recommendation: Default to caller-visible tasks; require admin for global list.
* **Spoofable social / ride actors** — Like/comment/delete-comment trust body/query `user_id`; unguarded ride create/book trust client `driver_id` / `passenger_id` (`posts.controller.ts`, `rides.controller.ts`). Recommendation: Bind actor to `req.user.userId` only.
* **Donations / items-delivery authorization gaps** — Donation update/delete require JWT but not owner/admin; items-delivery mutations lack guards and authorize via caller-supplied `userId`. Recommendation: Guard + ownership checks from JWT.
* **Auth refresh waiters hang on failure (mobile)** — Concurrent 401 refresh subscribers never settle when refresh fails (`apps/mobile/auth/interceptors/authFetchInterceptor.ts` ~46–90 clears the queue without notifying waiters). Recommendation: Reject all waiters in `finally`/error path before clearing the queue.
* **Swallowed DB initialization failures** — `database.init.ts` and task schema helpers continue startup after schema errors. Recommendation: Fail fast in production when required schema setup fails.
* **ClosedRoute task type inconsistency** — API-mapped closed tasks use `type: "task"` while completion UI expects `task_post` + `task_completion` (`ClosedRoute.tsx`, `PostReelItem.tsx`). Recommendation: Normalize feed item types at the mapper boundary.

## 🏗️ Architecture & Clean Code

* **Clean Architecture layers largely absent** — No `/domain` or `/application` packages under the monorepo; target documented in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` but `apps/api` remains Nest controllers/services with direct `pg` / Redis usage (e.g. tasks HTTP handlers ensure schema and inject the pool).
* **Infrastructure mixed into HTTP edge** — Controllers perform schema repair (`DROP TABLE`), capacity logic, and authorization using body-supplied identities instead of application use-cases + ports. This blocks consistent authz and testing.
* **SRS vs security NFR conflict** — Functional §2.1.6 documents `resolve-id` minting JWTs from identifiers and creating users if missing, which conflicts with §3.2 authentication/authorization expectations. Prefer §3.2 for security posture; update §2.1.6 and close the gap in `10-gaps-and-assumptions.md` (re-recorded this run — prior audit PRs still unmerged).
* **Inconsistent guard strategy** — Mix of `JwtAuthGuard`, `AdminAuthGuard`, `OptionalAuthGuard`, and completely unguarded mutation routes across adjacent modules (rides/items/CRM vs users/tasks).

## 🧹 Technical Debt & Maintenance

* **Oversized critical files** (well above ~200 LOC guidance): `posts.controller.ts` (~2741), `user-hierarchy.service.ts` (~1675), `stats.controller.ts` (~1709), `database.init.ts` (~1374), `auth.controller.ts` (~1029), `donations.controller.ts` (~892), `rides.controller.ts` (~779).
* **Duplicate user-resolution helpers** despite `user-resolution.service.ts` — also local resolvers in community-members, rides, dedicated-items.
* **Committed `data-backups/` PII** should be removed from the repo and added to `.gitignore`.
* **Dependency risk:** npm audit critical set unchanged (`handlebars`, `shell-quote`, `tar`, `websocket-driver`); high-severity count fluctuated **19 → 46 → 74** across consecutive runs (total **37–89**) — track upgrades for Nest/Expo transitive trees.
* **Deferred hardening** logged in `docs/SSOT/CODE_QUALITY/tech-debt-log.md` (authz hardening program, DDL removal, backup purge) — out of scope for this report-only PR.

### Prior-day continuity

Previous daily audits (2026-07-16 PR #110, 2026-07-24 PR #111, 2026-07-27 PR #112, 2026-07-28 PR #113) reported the same critical cluster; **application HEAD has not moved** (`3d92f9d`). No critical findings from those runs appear remediated on `dev`.

---

# 🛡️ Daily Audit Report: 2026-07-28

**HEAD:** `3d92f9d` (same as `origin/dev`; no application code merged since 2026-07-24 / prior audit window)

**Evidence timestamp:** `2026-07-28T06:01:47Z`

**Scope:** Holistic deep-scan of `apps/api`, `apps/mobile`, committed config/docs/backups; re-verification of the persistent critical cluster. Prior daily-audit PRs (#105–#112) remain **DRAFT / unmerged**, so `REPORTS/` and SSOT gap rows from those runs are not on `dev` yet — this report re-records them.

**npm audit (workspaces, observed range this run):** consecutive passes **37** (critical **4**, high **19**) → **61** (critical **4**, high **46**) → final HEAD **89** (critical **4**, high **74**). Registry remains non-deterministic for this lockfile — report max/range, not a single stable count. Critical packages: `handlebars`, `shell-quote`, `tar`, `websocket-driver`.

## 🚨 Critical Vulnerabilities

* **Identifier-only account takeover via `POST /api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`buildResolveSuccessResponse` ~645–661) -> Action: Require possession proof (Firebase ID token / Google ID token / password). Never mint JWT from bare `email` / `firebase_uid` / `google_id`. Align §2.1.6 with §3.2 or deprecate the endpoint.
* **Privilege escalation via profile mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (~126–133), `apps/api/src/services/user-profile.service.ts` (~345–361) -> Action: Enforce `:id === req.user.userId` (or admin). Strip `roles`, `firebase_uid`, and hierarchy fields from client `UpdateUserBody`; allow role changes only through guarded admin/hierarchy flows.
* **Client-spoofable hierarchy / admin actors** — File: `apps/api/src/controllers/users.controller.ts` (hierarchy endpoints ~45–88), `apps/api/src/services/user-hierarchy.service.ts` (promote/demote/`setManager`) -> Action: Derive acting principal exclusively from JWT (`req.user`). Reject body-supplied `requestingAdminId` / `requestingUserId` / `managerId` as authority.
* **Unauthenticated or optionally-authenticated mutation surfaces** — Files: `apps/api/src/auth/guards/jwt-auth.guard.ts` (`OptionalAuthGuard` always returns `true` ~338); unguarded / optional-guard writes on chat, rides, items-delivery, CRM, community-members, rate-limit controllers -> Action: Require `JwtAuthGuard` (or stricter) on all mutating routes; scope rate-limit admin ops to `AdminAuthGuard`; treat guest chat as read-only per product policy.
* **Committed secrets and credentialed backups in git** — Files: `apps/api/railway.toml.dev` (`JWT_SECRET` ~34); `docs/SSOT/runbooks/api/*` (JWT/Redis/DB password fragments); **49** JSON dumps under `apps/api/data-backups/20251224-162421/` (emails, phones, password hashes, Google IDs) -> Action: Rotate all exposed secrets immediately; purge backups/secrets from history; use env/secret managers only; add pre-commit secret scanning.
* **Request/startup-path destructive DDL (`DROP TABLE ... CASCADE`)** — Files: `apps/api/src/controllers/posts.controller.ts` (~78, ~309, ~373–374); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (~568, ~670) -> Action: Remove DROP from request handlers entirely; gate startup DDL behind explicit migration tooling with environment checks; never auto-drop production tables for “schema repair”.

## 🐞 Bugs & Logic Issues

* **Ride booking / approval oversell race** — Concurrent bookings/approvals can exceed `available_seats` (`apps/api/src/controllers/rides.controller.ts` ~374+; no row lock / conditional capacity update). Recommendation: `SELECT … FOR UPDATE` on the ride row (or atomic `UPDATE … WHERE remaining >= seats`) inside a transaction before approving.
* **Task done PATCH creates duplicate completion posts** — Repeated `PATCH` with `status: "done"` re-runs side effects (`tasks-patch-mutation.service.ts`; `tasks-side-effects.service.ts`). Recommendation: Transition guard (`WHERE status <> 'done'`) + idempotent completion side effects (unique constraint / upsert).
* **Unscoped `GET /api/tasks` for any JWT** — List path never scopes by assignee/creator/role (`tasks.controller.ts` ~74–136; `tasks-list-query.service.ts`). Recommendation: Default to caller-visible tasks; require admin for global list.
* **Spoofable social / ride actors** — Like/comment/delete-comment trust body/query `user_id`; unguarded ride create trusts client `driver_id` as `author_id` (`posts.controller.ts`, `rides.controller.ts`). Recommendation: Bind actor to `req.user.userId` only.
* **Donations / items-delivery authorization gaps** — Donation update/delete require JWT but not owner/admin; items-delivery mutations lack guards and authorize via caller-supplied `userId`. Recommendation: Guard + ownership checks from JWT.
* **Auth refresh waiters hang on failure (mobile)** — Concurrent 401 refresh subscribers never settle when refresh fails (`apps/mobile/auth/interceptors/authFetchInterceptor.ts` ~46–90 clears the queue without notifying waiters). Recommendation: Reject all waiters in `finally`/error path before clearing the queue.
* **Swallowed DB initialization failures** — `database.init.ts` and task schema helpers continue startup after schema errors. Recommendation: Fail fast in production when required schema setup fails.
* **ClosedRoute task type inconsistency** — API-mapped closed tasks use `type: "task"` while completion UI expects `task_post` + `task_completion` (`ClosedRoute.tsx`, `PostReelItem.tsx`). Recommendation: Normalize feed item types at the mapper boundary.

## 🏗️ Architecture & Clean Code

* **Clean Architecture layers largely absent** — No `/domain` or `/application` packages under the monorepo; target documented in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` but `apps/api` remains Nest controllers/services with direct `pg` / Redis usage (e.g. tasks HTTP handlers ensure schema and inject the pool).
* **Infrastructure mixed into HTTP edge** — Controllers perform schema repair, capacity logic, and authorization using body-supplied identities instead of application use-cases + ports. This blocks consistent authz and testing.
* **SRS vs security NFR conflict** — Functional §2.1.6 documents `resolve-id` minting JWTs from identifiers and creating users if missing, which conflicts with §3.2 authentication/authorization expectations. Prefer §3.2 for security posture; update §2.1.6 and close the gap in `10-gaps-and-assumptions.md` (re-recorded this run — prior audit PRs still unmerged).
* **Inconsistent guard strategy** — Mix of `JwtAuthGuard`, `AdminAuthGuard`, `OptionalAuthGuard`, and completely unguarded mutation routes across adjacent modules (rides/items/CRM vs users/tasks).

## 🧹 Technical Debt & Maintenance

* **Oversized critical files** (well above ~200 LOC guidance): `posts.controller.ts` (~2741), `user-hierarchy.service.ts` (~1675), `stats.controller.ts` (~1709), `database.init.ts` (~1374), `auth.controller.ts` (~1029), `donations.controller.ts` (~892), `rides.controller.ts` (~779).
* **Duplicate user-resolution helpers** despite `user-resolution.service.ts` — also local resolvers in community-members, rides, dedicated-items.
* **Committed `data-backups/` PII** should be removed from the repo and added to `.gitignore`.
* **Dependency risk:** npm audit critical set unchanged (`handlebars`, `shell-quote`, `tar`, `websocket-driver`); high-severity count fluctuated **19 → 46 → 74** across consecutive runs (total **37–89**) — track upgrades for Nest/Expo transitive trees.
* **Deferred hardening** logged in `docs/SSOT/CODE_QUALITY/tech-debt-log.md` (authz hardening program, DDL removal, backup purge) — out of scope for this report-only PR.

### Prior-day continuity

Previous daily audits (2026-07-16 PR #110, 2026-07-24 PR #111, 2026-07-27 PR #112) reported the same critical cluster; **application HEAD has not moved** (`3d92f9d`). No critical findings from those runs appear remediated on `dev`.

---

# 🛡️ Daily Audit Report: 2026-07-27

**HEAD:** `3d92f9d` (same as `origin/dev`; no application code merged since 2026-07-24 audit)

**Evidence timestamp:** `2026-07-27T06:07:06Z`

**Scope:** Holistic deep-scan of `apps/api`, `apps/mobile`, committed config/docs/backups; focused re-verification of persistent critical findings.

**npm audit (workspaces, observed range this run):** first pass **37** total (critical **4**, high **19**); re-check at final HEAD **61** total (critical **4**, high **46**). Registry remains non-deterministic for this lockfile — report max/range, not a single stable count. Critical packages: `handlebars`, `shell-quote`, `tar`, `websocket-driver`.

## 🚨 Critical Vulnerabilities

* **Identifier-only account takeover via `POST /api/users/resolve-id`** — File: `apps/api/src/controllers/users.controller.ts` (~183–188), `apps/api/src/services/user-auth.service.ts` (`buildResolveSuccessResponse` ~645–661) -> Action: Require possession proof (Firebase ID token / Google ID token / password). Never mint JWT from bare `email` / `firebase_uid` / `google_id`. Align §2.1.6 with §3.2 or deprecate the endpoint.
* **Privilege escalation via profile mass-assignment** — File: `apps/api/src/controllers/users.controller.ts` (~126–133), `apps/api/src/services/user-profile.service.ts` (~345–361) -> Action: Enforce `:id === req.user.userId` (or admin). Strip `roles`, `firebase_uid`, and hierarchy fields from client `UpdateUserBody`; allow role changes only through guarded admin/hierarchy flows.
* **Client-spoofable hierarchy / admin actors** — File: `apps/api/src/controllers/users.controller.ts` (hierarchy endpoints ~45–64), `apps/api/src/services/user-hierarchy.service.ts` (promote/demote/`setManager`) -> Action: Derive acting principal exclusively from JWT (`req.user`). Reject body-supplied `requestingAdminId` / `requestingUserId` / `managerId` as authority.
* **Unauthenticated or optionally-authenticated mutation surfaces** — Files: `apps/api/src/auth/guards/jwt-auth.guard.ts` (`OptionalAuthGuard` always returns `true` ~338); unguarded / optional-guard writes on chat, rides, items, items-delivery, CRM, community-members, sessions, rate-limit controllers -> Action: Require `JwtAuthGuard` (or stricter) on all mutating routes; scope session/rate-limit admin ops to `AdminAuthGuard`; treat guest chat as read-only per product policy.
* **Committed secrets and credentialed backups in git** — Files: `apps/api/railway.toml.dev` (`JWT_SECRET` ~34); `docs/SSOT/runbooks/api/*` (JWT/Redis/DB password fragments); `apps/api/src/main.ts` / Redis check scripts (password markers); **49** JSON dumps under `apps/api/data-backups/20251224-162421/` (emails, phones, password hashes, Google IDs) -> Action: Rotate all exposed secrets immediately; purge backups/secrets from history; use env/secret managers only; add pre-commit secret scanning.
* **Request/startup-path destructive DDL (`DROP TABLE ... CASCADE`)** — Files: `apps/api/src/controllers/posts.controller.ts` (~78, ~309, ~373–374); `apps/api/src/tasks/tasks-schema.service.ts` (~41); `apps/api/src/database/database.init.ts` (~568, ~670) -> Action: Remove DROP from request handlers entirely; gate startup DDL behind explicit migration tooling with environment checks; never auto-drop production tables for “schema repair”.

## 🐞 Bugs & Logic Issues

* **Ride booking / approval oversell race** — Concurrent approvals can exceed `available_seats` (`apps/api/src/controllers/rides.controller.ts` ~374–555; no row lock / conditional capacity update). Recommendation: `SELECT … FOR UPDATE` on the ride row (or atomic `UPDATE … WHERE remaining >= seats`) inside a transaction before approving.
* **Task done PATCH creates duplicate completion posts** — Repeated `PATCH` with `status: "done"` re-runs side effects (`tasks-patch-mutation.service.ts` ~380; `tasks-side-effects.service.ts` ~441–477). Recommendation: Transition guard (`WHERE status <> 'done'`) + idempotent completion side effects (unique constraint / upsert).
* **Unscoped `GET /api/tasks` for any JWT** — List path never scopes by assignee/creator/role (`tasks.controller.ts` ~74–136; `tasks-list-query.service.ts`). Recommendation: Default to caller-visible tasks; require admin for global list.
* **Spoofable social / ride actors** — Like/comment/delete-comment trust body/query `user_id`; unguarded ride create trusts client `driver_id` as `author_id` (`posts.controller.ts`, `rides.controller.ts`). Recommendation: Bind actor to `req.user.userId` only.
* **Donations / items-delivery authorization gaps** — Donation update/delete require JWT but not owner/admin; items-delivery mutations lack guards and authorize via caller-supplied `userId`. Recommendation: Guard + ownership checks from JWT.
* **Auth refresh waiters hang on failure (mobile)** — Concurrent 401 refresh subscribers never settle when refresh fails (`apps/mobile/auth/interceptors/authFetchInterceptor.ts` ~9–82). Recommendation: Reject all waiters in `finally`/error path before clearing the queue.
* **Swallowed DB initialization failures** — `database.init.ts` (~80–86) and task schema helpers continue startup after schema errors. Recommendation: Fail fast in production when required schema setup fails.
* **ClosedRoute task type inconsistency** — API-mapped closed tasks use `type: "task"` while completion UI expects `task_post` + `task_completion` (`ClosedRoute.tsx`, `PostReelItem.tsx`). Recommendation: Normalize feed item types at the mapper boundary.

## 🏗️ Architecture & Clean Code

* **Clean Architecture layers largely absent** — No `/domain` or `/application` packages under the monorepo; target documented in `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md` but `apps/api` remains Nest controllers/services with direct `pg` / Redis usage (e.g. `tasks.controller.ts` injects pool and ensures schema in HTTP handlers).
* **Infrastructure mixed into HTTP edge** — Controllers perform schema repair, capacity logic, and authorization using body-supplied identities instead of application use-cases + ports. This blocks consistent authz and testing.
* **SRS vs security NFR conflict** — Functional §2.1.6 documents `resolve-id` minting JWTs from identifiers and creating users if missing, which conflicts with §3.2 authentication/authorization expectations. Prefer §3.2 for security posture; update §2.1.6 and close the gap in `10-gaps-and-assumptions.md` (this audit re-records it — prior audit PRs were not merged to `dev`).
* **Inconsistent guard strategy** — Mix of `JwtAuthGuard`, `AdminAuthGuard`, `OptionalAuthGuard`, and completely unguarded mutation routes across adjacent modules (rides/items/CRM vs users/tasks).

## 🧹 Technical Debt & Maintenance

* **Oversized critical files** (well above ~200 LOC guidance): `posts.controller.ts` (~2742), `user-hierarchy.service.ts` (~1676), `stats.controller.ts` (~1710), `database.init.ts` (~1375), `auth.controller.ts` (~1030), `donations.controller.ts` (~893), `rides.controller.ts` (~780).
* **Duplicate user-resolution helpers** despite `user-resolution.service.ts` — also local resolvers in community-members, rides, dedicated-items.
* **Committed `data-backups/` PII** should be removed from the repo and added to `.gitignore`.
* **Dependency risk:** npm audit critical set unchanged (`handlebars`, `shell-quote`, `tar`, `websocket-driver`); high-severity count fluctuated **19 → 46** between consecutive runs — track upgrades for Nest/Expo transitive trees.
* **Deferred hardening** logged in `docs/SSOT/CODE_QUALITY/tech-debt-log.md` (authz hardening program, DDL removal, backup purge) — out of scope for this report-only PR.

### Prior-day continuity

Previous daily audits (2026-07-16 PR #110, 2026-07-24 PR #111) reported the same critical cluster; **application HEAD has not moved** (`3d92f9d`). No critical findings from those runs appear remediated on `dev`.
