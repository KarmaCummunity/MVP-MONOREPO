# 🛡️ Daily Audit Report: 2026-07-11

## Audit Scope

Daily deep scan against the current `dev` baseline (`3d92f9d`) and the project SSOT:

- Requirements: `docs/SSOT/SRS/README.md`, `03-non-functional-requirements.md`, `05-backend-architecture.md`, `functional/02-01-authentication.md`
- Quality guardrails: `docs/SSOT/CODE_QUALITY/README.md`, `layers-and-boundaries.md`, `constraints.md`, `testing.md`, `tech-debt-log.md`
- Repository surface checked: 994 tracked files; focused searches across API, mobile, docs/runbooks, scripts, package manifests, and dependency lockfile.

## 🚨 Critical Vulnerabilities

* Account takeover via unauthenticated identity resolution - File: `apps/api/src/controllers/users.controller.ts:183`, `apps/api/src/services/user-auth.service.ts:270`, `apps/api/src/services/user-auth.service.ts:645` -> Action: Require verified Firebase/Google ID tokens or an authenticated session before resolving/linking identities; never mint JWT access/refresh tokens from an email-only request.
* Privilege escalation through user profile update - File: `apps/api/src/controllers/users.controller.ts:126`, `apps/api/src/services/user-profile.service.ts:349` -> Action: Bind updates to `req.user.userId`; reject `roles`, hierarchy, and manager fields unless protected by `AdminAuthGuard`; audit all role changes.
* Admin impersonation through body-supplied requester IDs - File: `apps/api/src/controllers/users.controller.ts:45`, `apps/api/src/controllers/users.controller.ts:64`, `apps/api/src/services/user-hierarchy.service.ts:947` -> Action: Remove `requestingAdminId` / `requestingUserId` trust from request bodies and derive the acting principal only from the JWT payload.
* Demo session API registered in production without auth - File: `apps/api/src/app.module.ts:97`, `apps/api/src/auth/controllers/session.controller.ts:6`, `apps/api/src/auth/controllers/session.controller.ts:136`, `apps/api/src/auth/controllers/session.controller.ts:211`, `apps/api/src/auth/controllers/session.controller.ts:235` -> Action: Remove `SessionController` from production or gate it behind admin/owner auth; prevent unauthenticated session validation, enumeration, global logout, and stats access.
* Committed environment secrets and credential fragments - File: `apps/api/railway_vars.txt:8`, `apps/api/railway_vars.txt:27`, `apps/api/railway_vars.txt:35`, `apps/api/railway_vars.txt:85`, `apps/api/railway.toml.dev:34`, `docs/SSOT/runbooks/api/environment-separation.md:126` -> Action: Rotate exposed DB/Redis/JWT/Google credentials, remove sensitive files from git history, and replace docs with placeholders.
* Dependency audit reports unresolved critical/high vulnerabilities - File: `package-lock.json` -> Action: Run controlled dependency upgrades for `handlebars`, `shell-quote`, `axios`, `@grpc/grpc-js`, `fast-xml-parser`, `multer` / `@nestjs/platform-express`, `protobufjs`, `undici`, `ws`, and related transitive packages; validate with `npm audit --workspaces --audit-level=moderate`.

## 🐞 Bugs & Logic Issues

* Concurrent token refresh waiters can hang forever when refresh fails - File: `apps/mobile/auth/interceptors/authFetchInterceptor.ts:46` -> Recommendation: Track success and failure subscribers, reject or resolve all queued requests on refresh failure, and consider a waiter timeout to avoid stuck loading states.
* Editing a post image can persist a local device URI to shared API state - File: `apps/mobile/components/Feed/EditPostModal.tsx:73`, `apps/mobile/components/Feed/EditPostModal.tsx:117`, `apps/mobile/components/PostsReelsScreen.tsx:564`, `apps/api/src/controllers/posts.controller.ts:2349` -> Recommendation: Upload selected images to durable storage before saving and reject `file://`, `content://`, and `blob:` values server-side.
* Admin tasks cache key ignores multi-value category filters - File: `apps/api/src/tasks/tasks.controller.ts:113`, `apps/api/src/tasks/tasks.controller.ts:120`, `apps/api/src/tasks/tasks-list-query.service.ts:57` -> Recommendation: Normalize the full `categoryList` and other multi-value filters into cache keys, or disable caching for multi-value queries.
* Discovery feed fetches unscoped standalone tasks for every authenticated user - File: `apps/mobile/hooks/useFeedData.ts:12`, `apps/mobile/hooks/useFeedData.ts:140`, `apps/api/src/tasks/tasks.controller.ts:75` -> Recommendation: Scope task listing by current user/role or remove global task merging from the public discovery feed.
* Several authenticated mutations trust body identity fields instead of JWT identity - File: `apps/api/src/controllers/posts.controller.ts:1343`, `apps/api/src/controllers/posts.controller.ts:1573`, `apps/api/src/controllers/donations.controller.ts:478`, `apps/api/src/controllers/chat.controller.ts:441`, `apps/api/src/controllers/rides.controller.ts:47` -> Recommendation: Derive actor IDs from `req.user.userId`; require `JwtAuthGuard` on chat/rides mutations; compare supplied IDs only for explicit admin workflows.
* `postsService` bypasses the shared refresh-aware fetch path - File: `apps/mobile/utils/postsService.ts:82` -> Recommendation: Route post interactions through `fetchWithAuth` or a shared API request helper so expired access tokens refresh consistently.

## 🏗️ Architecture & Clean Code

* Request-time DDL and destructive schema recreation live in `PostsController` - File: `apps/api/src/controllers/posts.controller.ts:67`, `apps/api/src/controllers/posts.controller.ts:176`, `apps/api/src/controllers/posts.controller.ts:842` -> Action: Move schema creation/migration to infrastructure-owned startup migrations and keep controllers limited to HTTP orchestration.
* Duplicate posts schema logic can drift and both paths can drop `posts` - File: `apps/api/src/controllers/posts.controller.ts:206`, `apps/api/src/tasks/tasks-schema.service.ts:18`, `apps/api/src/tasks/tasks-schema.service.ts:41` -> Action: Consolidate posts DDL into one migration/schema service and align columns (`ride_id`, `item_id`, `status`, indexes) across all callers.
* No dedicated `/domain` or `/application` layers exist to enforce the documented dependency direction - File: `docs/SSOT/CODE_QUALITY/layers-and-boundaries.md:1`, `apps/api/src/controllers/posts.controller.ts`, `apps/api/src/controllers/donations.controller.ts`, `apps/api/src/controllers/rides.controller.ts` -> Action: When touching features, extract domain/application rules into framework-free services or use cases and keep DB/Redis/NestJS dependencies in infrastructure adapters.
* Monolithic controllers mix HTTP, SQL, cache, validation, and business rules - File: `apps/api/src/controllers/posts.controller.ts`, `apps/api/src/controllers/stats.controller.ts`, `apps/api/src/controllers/donations.controller.ts`, `apps/api/src/controllers/rides.controller.ts`, `apps/api/src/controllers/chat.controller.ts` -> Action: Follow the partial `apps/api/src/tasks/*` split by moving query/mutation/use-case logic into cohesive services with unit tests.
* Mobile data-access boundaries remain split across overlapping services - File: `apps/mobile/utils/databaseService.ts`, `apps/mobile/utils/enhancedDatabaseService.ts`, `apps/mobile/utils/restAdapter.ts`, `apps/mobile/utils/firestoreAdapter.ts` -> Action: Continue the logged refactor toward a single facade/port boundary and retire duplicate active paths.

## 🧹 Technical Debt & Maintenance

* Test coverage is thin for high-risk API paths - File: `apps/api/src/**/*.spec.ts`, `apps/api/src/controllers/posts.controller.ts`, `apps/api/src/controllers/donations.controller.ts`, `apps/api/src/controllers/rides.controller.ts` -> Action: Add focused unit/integration tests for auth binding, role changes, posts interactions, donations attribution, rides CRUD, and task list caching.
* Oversized hotspots exceed the project complexity target - File: `apps/api/src/controllers/posts.controller.ts`, `apps/api/src/database/database.init.ts`, `apps/mobile/utils/apiService.ts`, `apps/mobile/components/PostsReelsScreen.tsx`, `apps/mobile/globals/styles.tsx` -> Action: Extract cohesive services/components opportunistically during feature work; avoid broad unrelated rewrites in one PR.
* Ad-hoc API verification/debug scripts remain in the package root - File: `apps/api/verify-fix.ts`, `apps/api/verify-db-init-fix.ts`, `apps/api/test-split-sql.ts`, `apps/api/update-karmacommunity-admin.ts` -> Action: Move operational scripts under a documented `scripts/` or `tools/` location and make destructive scripts require explicit environment confirmation.
* Orphan donation category screens are still present after navigation trim - File: `apps/mobile/donationScreens/ClothesScreen.tsx`, `apps/mobile/donationScreens/DreamsScreen.tsx`, `apps/mobile/donationScreens/CategoryScreen.tsx`, `docs/SSOT/CODE_QUALITY/tech-debt-log.md:9` -> Action: Delete or re-register these wrappers based on product scope.
* Error details still leak through several API responses - File: `apps/api/src/auth/controllers/session.controller.ts:123`, `apps/api/src/controllers/rate-limit.controller.ts:143`, `apps/api/src/controllers/donations.controller.ts:466` -> Action: Centralize error mapping and return generic client messages in production while logging detailed errors server-side.

## Verification Evidence

* `git fetch origin dev && git diff --stat origin/dev...HEAD` confirmed this audit branch started with no source changes beyond `origin/dev`.
* `npm audit --workspaces --audit-level=moderate` completed with 32 vulnerabilities: 2 low, 15 moderate, 13 high, 2 critical.
* Targeted `rg` scans checked hardcoded secrets/config, auth guards and identity body fields, XSS/eval patterns, request-time DDL, SQL interpolation patterns, TODO/FIXME debt, and domain-layer paths.
