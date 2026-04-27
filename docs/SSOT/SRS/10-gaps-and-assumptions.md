> **SRS shard:** `SRS/10-gaps-and-assumptions.md` — part of [SRS index](README.md). References § refer to the full document.

## 10. Gaps & Assumptions

### 10.1 Missing or Incomplete Features

| Area | Gap | Evidence |
|------|-----|----------|
| **`operator` role** | **Partially addressed:** `OperatorAuthGuard` exists in `jwt-auth.guard.ts` (exported from `AuthModule`); mobile exposes `isOperator`, `userHasOperatorAccess`, and `useOperatorProtection`. **Still required:** assign `operator` in `user_profiles.roles` via admin flows, add `/api/operator/*` module using the guard, register operator screens + navigation. `computeRole` still maps only to `admin` \| `user` — acceptable until operator-specific UI branches on `isOperator`. | `jwt-auth.guard.ts`, `userStore.ts`, `hooks/useOperatorProtection.ts` |
| **`anonymity_level` on posts** | The `posts` table DDL (in `posts-schema.service.ts` and `schema.sql`) does **not** include an `anonymity_level` column. No anonymity-aware filtering exists in `PostsService.getPosts()`. **Required:** ALTER TABLE migration to add `anonymity_level SMALLINT DEFAULT 4 CHECK (anonymity_level BETWEEN 1 AND 4)`, update post creation DTO, update feed queries with role/follow-aware filtering. | `posts-schema.service.ts` DDL lines; `posts.service.ts` `getPosts()` |
| **OperatorMatchingModule** | No module, controller, service, or DTO exists under `apps/api/src/modules/` for operator matching. **Required:** full new NestJS module with controller (`/api/operator/*`), services (queue, case, candidate, audit), DTOs; use **`OperatorAuthGuard`** on routes. | Directory listing of `apps/api/src/modules/` |
| **Matching database tables** | `matching_cases`, `matching_candidates`, `matching_case_audit` do **not** exist in `schema.sql` or `database.init.ts`. **Required:** new SQL migration or addition to `DatabaseInit`. | Schema file search |
| **Shiduchim Tov mobile screens** | `ShiduchimTovScreen`, `OperatorQueueScreen`, `OperatorCaseDetailScreen`, `OperatorCaseListScreen`, `OperatorAuditScreen` do **not** exist. DonationsStack.tsx does not register them. `DonationsStackParamList` in `globals/types.tsx` does not include them. **Required:** new screen files, navigation registration, type updates, and i18n keys. | `DonationsStack.tsx` imports; `globals/types.tsx` |
| **`shiduchimTov` donation category** | The `BASE_CATEGORIES` array in `DonationsScreen.tsx` does not include a `shiduchimTov` entry. No `donation_categories` row with slug `shiduchim-tov` exists in seed data. **Required:** add category to mobile grid + optional DB seed. | `bottomBarScreens/DonationsScreen.tsx` |
| **Donations tab category grid vs §2.3.1** | Mobile `DonationsScreen` / `DonationsStack` intentionally surface **eight** entry points (money, items, rides/trump, knowledge, challenges, time, food, housing) and no longer register the previous long tail of placeholder category screens. SRS §2.3.1 still lists **30+** observed categories and API listing is unchanged — **reconcile** when product scope for the donations tab is finalized. | `bottomBarScreens/DonationsScreen.tsx`; `navigations/DonationsStack.tsx` |
| **Operator notification types** | Notification types `operator_new_queue_item`, `operator_candidate_response`, `operator_case_reassigned` are not defined. **Required:** extend notification type vocabulary and dispatching logic. | `notifications.controller.ts` |
| **Post creation anonymity UI** | No anonymity-level selector exists in the post-creation flow (mobile). **Required:** new `AnonymityLevelSelector` component integrated into post creation modal/screen. | Feed / post creation component search |
| **`useOperatorProtection` hook** | **Done** — `hooks/useOperatorProtection.ts` mirrors `useAdminProtection`, using `isOperator` (operator \| admin \| super_admin). **Still required:** call it from operator/Shiduchim Tov screens when those screens exist. | `hooks/useOperatorProtection.ts` |
| **`operator` i18n namespace** | No `operator.json` in `locales/he/` or `locales/en/`. **Required:** new namespace with all Shiduchim Tov / operator workspace strings. | Locale file listing |
| **Events module** | Database tables exist (`community_events`, `event_attendees`) but **no controller or service** implements CRUD — events are schema-only | No event controller in `src/modules/` |
| **Organizations module** | Tables exist (`organizations`, `organization_applications`) but **no dedicated module** — only `OrgOnboardingScreen` and `AdminOrgApprovalsScreen` on mobile | No organization controller in API |
| **Payment/donation processing** | No payment gateway integration (Stripe, PayPal, etc.) — `donations.amount` is a data field with no transaction processing |K in dependencies |
| **Email service** | No email sending capability (no SMTP, SendGrid, etc.) — `sendPasswordReset` and `sendVerification` rely solely on Firebase Auth | No email SDK in API dependencies |
| **File upload (API)** | No `multer` or file upload middleware — admin files endpoint exists but actual upload handling is unclear | No multipart parser in API dependencies |
| **WebSocket/real-time** | No WebSocket or Socket.IO — all "real-time" features use HTTP polling | No `@nestjs/websockets` or `socket.io` in dependencies |
| **Chat persistence (API)** | Chat controller exists but business logic appears lightweight — rich chat features (reactions, voice, typing) exist only in mobile service | Mobile `chat.service.ts` has methods not reflected in API endpoints |
| **Search** | No dedicated search engine (Elasticsearch, etc.) — search is PostgreSQL `LIKE`/trigram only | GIN trigram indexes on items |
| **Testing coverage** | Only 3 test files in API (`health.controller.spec.ts`, `jwt.service.spec.ts`, `jwt-auth.guard.spec.ts`) — most modules untested | Aspirational testing expectations: `docs/SSOT/CODE_QUALITY/testing.md` |
| **Mobile testing** | Single test file (`authService.test.ts`) | Jest config exists but minimal tests |
| **API documentation** | No Swagger/OpenAPI — deferred; track under `docs/SSOT/CODE_QUALITY/tech-debt-log.md` | No `@nestjs/swagger` in dependencies |
| **Logging (mobile)** | `console.log` used in some places despite `.cursorrules` requiring project logger | Observed in `index.js` and some services |
| **`volunteer_manager` role** | SRS requires role + hierarchy semantics; **code may still only promote to `volunteer`** via `promote-volunteer` — align `roles[]`, guards, and mobile profile UI | Compare `user-hierarchy` / `JwtAuthGuard` / mobile role checks |
| **Org-affiliated volunteer** | Formal `user_profiles.organization_id` (or membership table) may be **missing**; `organizations` / `organization_applications` tables exist without full API | §2.2.5 |
| **Feed filter/sort API** | §2.5.6 requires query params or dedicated feed endpoint; **verify** `GET /api/posts` supports all declared filters/sorts | `posts.controller.ts` / `posts.service.ts` |
| **Profile personalization** | §2.2.6 requires role-based layout; **verify** profile screens branch on `roles` and `settings` | `ProfileScreen` / related components |

### 10.2 Assumptions

| # | Assumption |
|---|------------|
| 1 | The system is in **MVP/active development** phase — many tables exist without corresponding API endpoints (events, organizations) as forward schema provisioning |
| 2 | **Challenges `user_id` is VARCHAR** (not UUID) — assumed to be a separate identity system or legacy format; the mobile app may use string-based user IDs for challenges |
| 3 | **Donations and rides controllers** contain inline SQL without separate service files — assumed intentional for MVP speed, planned for refactoring |
| 4 | **Firebase is transitioning out** — `USE_FIRESTORE=false` default, `USE_BACKEND=true`; migration planning tracked in `docs/SSOT/CODE_QUALITY/tech-debt-log.md`; current architecture supports both but prefers REST |
| 5 | **Expo Router is deprecated** — returns null; real navigation is React Navigation stack/tab navigators |
| 6 | **Redis is optional** — the app runs without Redis but loses caching, sessions, rate limiting |
| 7 | The admin email allowlist on mobile (`EXPO_PUBLIC_ADMIN_EMAILS`) is a **client-side convenience** — actual admin enforcement is server-side via JWT roles |
| 8 | **`notifications` table** (in migrations) and **`user_notifications`** (in schema) may represent **duplicate/overlapping** notification storage — assumed migration in progress |
| 9 | **Concurrent FKs added via DO blocks** rather than inline — assumed for migration compatibility with existing data |
| 10 | **`volunteer_manager`** is treated as a **first-class role string** in `user_profiles.roles`; promotion and permission matrices may lag until implemented in API and mobile |
| 11 | **`operator`** will be treated as a **first-class role string** in `user_profiles.roles` once implemented. It is NOT an admin role — operators have access only to the matching workspace (§2.14), not to admin endpoints (§2.11). Admins/super_admins have implicit operator access. |
| 12 | **Operator matching is manual (human-in-the-loop)** — no automated ML recommendation is planned for the initial release. Future work may add scoring/suggestions but the SRS treats manual matching as the baseline. |
| 13 | **Shiduchim Tov** is a product-facing name only — the internal module is `operator-matching` and the slug is `shiduchim-tov`. It has no dependency on the existing `matchmaking` category or its data. |

### 10.3 Technical Debt & Risks

| Risk | Severity | Details |
|------|----------|---------|
| **Custom JWT implementation** | Medium | Hand-rolled HMAC-SHA256 JWT instead of battle-tested library (`jsonwebtoken`, `jose`). Functional but increases maintenance burden and attack surface |
| **No global exception filter** | Medium | Unhandled exceptions may leak stack traces in development. Production disables error messages via `ValidationPipe` but no catch-all filter |
| **Inline SQL injection risk** | Low-Medium | Most SQL uses parameterized queries (`$1`, `$2`), but complex queries with `pg-format` and string interpolation require careful review |
| **Dual notification tables** | Low | `user_notifications` and `notifications` may cause confusion; migration to unify needed |
| **No database migration tool** | Medium | Schema changes managed via SQL files and DO blocks — no Prisma/TypeORM/Knex migrations with version tracking. Adding matching tables (§6.1.13) will require careful manual migration. |
| **Client-side admin check** | Low | `EXPO_PUBLIC_ADMIN_EMAILS` on mobile is a convenience; server enforces roles. Risk: UI shows admin features to non-admin if env misconfigured |
| **Console.log in Redis cache service** | Low | `redis-cache.service.ts` uses `console.warn` instead of NestJS Logger — violates project coding standards |
| **Polling-based notifications** | Medium | 5-second polling interval creates unnecessary server load at scale; WebSocket or server-sent events would be more efficient. Operator queue polling adds to this load. |
| **No API versioning** | Medium | All routes under `/api/` with no version prefix — breaking changes affect all clients simultaneously. Adding `/api/operator/*` endpoints is safe but future versioning is recommended. |
| **No rate limiting on all endpoints** | Low | `ThrottlerGuard` only on `AuthController` and `NotificationsController`; other endpoints have per-token rate limiting only through `JwtAuthGuard`. Operator endpoints need their own rate-limit tier (§3.1). |
| **Hebrew in codebase** | Low | README, docs, some Dockerfile comments, and iOS `infoPlist` strings contain Hebrew — violates English-only code comments rule but acceptable in user-facing strings and documentation |
| **No Prisma/ORM** | Info | Deferred; see `docs/SSOT/CODE_QUALITY/tech-debt-log.md`. Current raw SQL works but makes schema changes harder to track |
| **Anonymity enforcement complexity** | Medium | Implementing server-side anonymity filtering in `PostsService.getPosts()` requires per-request role checking and follower-set joins, which may degrade feed query performance without proper indexing (add index on `posts.anonymity_level`). |
| **Operator PII access audit** | Medium | Without proper audit logging from day one, it will be difficult to retrospectively demonstrate compliance with privacy requirements. Audit tables (§6.1.13) should be created alongside the matching module. |

### 10.4 Deferred Items (track in CODE_QUALITY)

- Prisma ORM adoption
- Shared packages expansion
- `DatabaseInit` splitting into per-module migrations
- `ConfigService` adoption (replace `process.env` direct access)
- Logger cleanup (eliminate remaining `console.log`)
- Mobile store splits (decompose large stores)
- Swagger/OpenAPI documentation
- API versioning (`/api/v1/`, `/api/v2/`)
- Automated matching suggestions (ML/scoring layer on top of manual operator workflow — future enhancement to §2.14)