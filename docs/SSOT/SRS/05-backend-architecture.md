> **SRS shard:** `SRS/05-backend-architecture.md` — part of [SRS index](README.md). References § refer to the full document.

## 5. Backend Architecture

### 5.1 API Structure

**Framework:** NestJS (modular architecture)  
**Entry point:** `src/main.ts` → `AppModule`  
**Port:** 3001 (configurable via `PORT`)

**Module hierarchy:**

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (60 req/60s)
├── DatabaseModule (global, PG_POOL)
├── RedisModule (global, REDIS)
├── RedisCacheModule
├── AuthModule
│ ├── JwtService
│ ├── SessionService
│ ├── RateLimitService
│ ├── FirebaseAdminService
│ ├── AuthController
│ └── SessionController
├── UsersModule
│ ├── UserAuthService, UserProfileService
│ ├── UserFollowService, UserStatsService
│ ├── UserHierarchyService, UserResolutionService
│ └── 5 Controllers (auth, profile, hierarchy, stats, follow)
├── PostsModule
│ ├── PostsService, PostsLikesService, PostsCommentsService
│ ├── PostsSchemaService
│ └── PostsController
├── ItemsModule
│ ├── ItemsService, DedicatedItemsService, ItemsDeliveryService
│ └── 3 Controllers
├── DonationsModule → DonationsController
├── RidesModule → RidesController
├── StatsModule
│ ├── StatsQueriesService, StatsMapperService
│ ├── ComputedStatsService, StatsFacadeService
│ └── StatsController
├── AdminModule
│ ├── AdminTablesService, TasksService
│ └── 5 Controllers (tables, files, CRM, tasks, community-members)
├── ChallengesModule
│ └── 2 Controllers (personal, community group)
├── ChatModule → ChatController
├── NotificationsModule → NotificationsController
├── OperatorMatchingModule (NEW — required, see §2.14)
│ ├── OperatorQueueService
│ ├── MatchingCaseService
│ ├── MatchingCandidateService
│ ├── OperatorAuditService
│ ├── OperatorAuthGuard
│ └── OperatorController (prefix: /api/operator)
├── SyncModule → SyncController
└── SharedModule
    └── 4 Controllers (health, places, rate-limit, redis-test)
```

**Note on OperatorMatchingModule:** This module does **not** exist in the current codebase (`apps/api/src/modules/`). It is listed here as a **required addition**. See §10.1 for implementation status.

### 5.2 Services and Business Logic

**Data access pattern:** Direct SQL via `pg.Pool` (injected as `PG_POOL`), no ORM.

| Layer | Pattern |
|-------|---------|
| Controllers | HTTP routing, request validation, response formatting |
| Services | Business logic, SQL queries, Redis caching
| Guards | Authentication (`JwtAuthGuard`, `AdminAuthGuard`, `OptionalAuthGuard`, **`OperatorAuthGuard`** — required) |
| DTOs | Input validation via `class-validator` decorators |

**Notable pattern:** Donations and Rides controllers contain business logic directly (no separate service files).

**New DTOs required for operator matching:**
- `CreateMatchCaseDto`: `post_id` (UUID, required), `priority` (optional enum), `notes` (optional string)
- `ProposeMatchCandidateDto`: `candidate_user_id` (UUID, required), `candidate_type` (enum: volunteer | donor), `match_reason` (string, required)
- `UpdateCaseStatusDto`: `status` (enum), `notes` (optional)
- `UpdatePostAnonymityDto`: `anonymity_level` (integer 1–4, required)

### 5.3 Middleware

| Middleware | Type | Purpose |
|------------|------|---------|
| `body-parser` | Express | JSON/URL-encoded parsing (5MB limit) |
| `helmet` | Express | Security headers |
| CORS | Express | Cross-origin configuration |
| COOP/COEP | Custom Express | OAuth popup compatibility |
| `ValidationPipe` | NestJS Global | Request validation |
| `ThrottleGuard` | NestJS | Rate limiting per controller

### 5.4 Authentication & Authorization Flow### 5.4 Authentication & Authorization Flow

```
Client Request
    │
    ▼
Extract token from:
  - Authorization: Bearer <token>
  - X-Auth-Token: <token>
    │
    ▼
Rate limit check (100 req/60s per token prefix)
    │
    ▼
Try JWT verification (HMAC-SHA256)
    │
    ├─ Success → Check blacklist → Check expiry → Attach user to request
    │
    └─ Failure → Try Firebase ID token verification
                     │
                     ├─ Success → Lookup user by firebase_uid → Create payload → Attach
                     │
                     └─ Failure → 401 Unauthorized
    │
    ▼
(If AdminAuthGuard) Check roles include one of: admin, org_admin, super_admin (volunteer_manager and operator are not treated as admin unless policy changes)
    │
    ▼
(If OperatorAuthGuard — NEW) Check roles include one of: operator, admin, super_admin
    │
    ▼
Controller handler executes
```

---

