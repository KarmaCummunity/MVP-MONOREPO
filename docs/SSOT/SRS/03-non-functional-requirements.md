> **SRS shard:** `SRS/03-non-functional-requirements.md` — part of [SRS index](README.md). References § refer to the full document.

## 3. Non-Functional Requirements

### 3.1 Performance

- **Rate limiting:**
  - Global: 60 requests per 60 seconds via `@nestjs/throttler` (`ThrottlerGuard`)
  - Per-authenticated-request: 100 requests per 60 seconds per token prefix
  - Block duration: 5 minutes when rate limit exceeded
  - **Operator endpoints:** SHALL apply a separate rate-limit tier — 200 requests per 60 seconds per operator token — to accommodate higher-frequency queue polling during active triage sessions.
- **Database pool:** Max 20 connections, idle timeout 30s, connection timeout 2s
- **Redis:** Connection with retry strategy (`min(times × 200, 2000)ms`), offline queue disabled
- **HTTP server timeout:** 30 seconds
- **Body parser limit:** 5MB (JSON + URL-encoded)
- **Notification polling:** 5-second interval on mobile
- **Stats caching:** Redis-based with pattern invalidation

### 3.2 Security

- **Authentication:**
  - Dual-mode: Custom JWT (HMAC-SHA256) + Firebase ID token fallback
  - Access token: 1 hour expiry
  - Refresh token: 30 days expiry, stored in Redis
  - Token blacklisting via Redis with remaining TTL
  - No auth bypass in development (SEC-003.1: `BYPASS_AUTH` explicitly removed)
  - JWT secret minimum 32 characters enforced at startup
- **Authorization:**
  - Role-based: `user`, `volunteer`, `volunteer_manager`, **`operator`**, `admin`, `org_admin`, `super_admin` (plus organization-scoped rules for org-linked volunteers where implemented)
  - `AdminAuthGuard` extends `JwtAuthGuard`, checks roles array for elevated admin operations (`admin` | `org_admin` | `super_admin`); **`volunteer_manager` and `operator` are not admin roles** unless explicitly added to product policy
  - **`OperatorAuthGuard`** (implemented in `jwt-auth.guard.ts`): extends `JwtAuthGuard` and checks for `operator` | `admin` | `super_admin` in `user.roles`. SHALL protect all `/api/operator/*` endpoints once that module exists. See §10.1.
  - `OptionalAuthGuard` allows unauthenticated access while enriching authenticated requests
  - Admin access is role-based only — no hardcoded email checks (SEC-003.1)
  - Only `ROOT_ADMIN_EMAIL` is hardcoded for initial bootstrap
- **Anonymity enforcement:**
  - Posts with `anonymity_level < 4` SHALL have author identity fields stripped from API responses for unauthorized viewers (server-side — never rely on client-side redaction alone).
  - Operator endpoints SHALL enforce that only users with `operator` role can access requester PII in the matching context.
  - Match candidates SHALL NOT see requester identity until mutual acceptance (§2.14.4).
- **HTTP security headers (via `helmet`):**
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - HSTS enabled
  - XSS filter enabled
  - Referrer-Policy configured
  - CSP disabled (for OAuth compatibility)
  - COOP: `same-origin-allow-popups` (for Google OAuth popups)
  - COEP: `unsafe-none` (for OAuth)
- **Validation:**
  - Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
  - Error messages disabled in production (`disableErrorMessages: true`)
  - Class-validator decorators on DTOs
- **Password hashing:** `argon2` (not bcrypt)
- **CORS:** Configurable via `CORS_ORIGIN` env var, comma-separated origins
- **Environment cross-check:** `main.ts` validates database/Redis URLs don't mix dev/prod

### 3.3 Scalability

- **Stateless API:** JWT-based auth allows horizontal scaling
- **Redis:** Used for caching (stats), sessions, token blacklist, rate limiting — can be scaled independently
- **PostgreSQL connection pooling:** Max 20 connections per instance
- **Monorepo structure:** Supports independent deployment of API and mobile
- **Railway deployment:** Docker-based with restart on failure (max 10 retries), health checks

### 3.4 Reliabilitycks:** `/health` and `/health/redis` endpoints
- **Railway health check:** `healthcheckPath: "/health"`, timeout 300s
- **Graceful shutdown:** SIGTERM/SIGINT handlers with logging
- **Unhandled rejection/exception:** Logged and process exits with code 1
- **Redis optional:** Application functions without Redis (returns null/defaults)
- **Database init:** Schema runs on startup via `DatabaseInit`, idempotent (CREATE IF NOT EXISTS, DO blocks)
- **Pre-push hook:** Quality gate with ESLint, tests, optional Sonar check

### 3.5 Privacy, Audit Logging, and Access Control (NEW)

- **Audit logging for operator actions:**
  - Every read, create, update, and status-transition action on matching cases and queue items SHALL be recorded in the `matching_case_audit` table (§6.1.13).
  - Audit records include: `actor_id` (operator/admin), `action` (enum: `view_queue`, `claim_item`, `create_case`, `propose_candidate`, `update_status`, `add_note`, `view_requester_pii`), `timestamp`, `case_id` (nullable for queue-level actions), and `details` JSONB.
  - Audit logs SHALL be immutable (INSERT only, no UPDATE/DELETE by application code). Retention: minimum 2 years or per legal requirements.
- **PII access logging:**
  - Accessing author identity for a Level 1/2/3 post through operator endpoints SHALL generate an audit record with action `view_requester_pii`. This enables compliance review of who accessed what personal data and when.
- **Data minimization:**
  - API responses for non-operator users SHALL omit fields that the requesting user is not authorized to see (server-side projection, not client-side filtering).
  - Match candidate notifications SHALL contain the minimum information needed to evaluate the match (category, approximate location, need description — no requester name/contact).
- **Access control summary:**

  | Resource | `user` | `volunteer` | `operator` | `admin` | `super_admin` |
  |----------|--------|-------------|------------|---------|---------------|
  | Public feed (Level 4 posts) | Read | Read | Read | Read+Mod | Full |
  | Level 3 posts (redacted) | Read (redacted) | Read (redacted) | Read (full) | Read+Mod (full) | Full |
  | Level 2 posts | Hidden (unless follower → redacted) | Hidden (unless follower → redacted) | Read (full) | Read+Mod (full) | Full |
  | Level 1 posts | Hidden | Hidden | Read (full) | Read+Mod (full) | Full |
  | Operator queue | Forbidden | Forbidden | Read+Claim | Read+Claim | Full |
  | Match cases | Forbidden | Forbidden | CRUD (own) | CRUD (all) | Full |
  | Audit logs | Forbidden | Forbidden | Read (own cases) | Read (all) | Full |

### 3.6 Client UI — responsive layout and platforms

- **Responsive UI:** The mobile + web client SHALL present usable layouts for a representative range of screen sizes and in both portrait and landscape (where applicable), on iOS, Android, and web, per the implementation rules and helper references in [§4.8](04-frontend-architecture.md#48-responsive-layout-orientation-and-platform-specific-behavior) of the frontend architecture shard.

---

