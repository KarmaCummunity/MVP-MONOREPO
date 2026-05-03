> **SRS shard:** `SRS/07-data-flow.md` — part of [SRS index](README.md). References § refer to the full document.

## 7. Data Flow

### 7.1 Authentication Flow

```
Mobile/Web Client API Server External
      │ │ │
      │ 1. User enters credentials │ │
      │ ────────────────────────────► │ │
      │ POST /auth/login │ │
      │ │ 2. Verify password │
      │ │ (argon2.verify) │
      │ │ │
      │ │ 3. Create JWT pair │
      │ │ ──► Redis: store │
      │ │ refresh token │
      │ 4. Return tokens + user │ │
      │ ◄────────────────────────────│ │
      │ │ │
      │ 5. Store JWT in AsyncStorage │ │
      │ │ │
      │ -- OR for Google OAuth -- │ │
      │ │ │
      │ 1. Google Sign-In popup │ │
      ─
      │ │ Google OAuth │
      │ 2. ID Token returned │ │
      ─
      │ │ │
      │ 3. POST /auth/google │ │
      │ ────────────────────────────► │ │
      │ │ 4. Verify Google token │
      │ │ (google-auth-library) │
      │ │ 5. Find/create user │
      │ │ 6. Create JWT pair │
      │ 7. Return tokens + user │ │
      │ ◄────────────────────────────│ │
```

### 7.2 Authenticated Request Flow

```
Mobile/Web Client API Server PostgreSQL / Redis
      │ │ │
      │ 1. Request with Bearer token │ │
      │ ────────────────────────────► │ │
      │ │ │
      │ │ 2. JwtAuthGuard: │
      │ │ a. Extract token │
      │ │ b. Rate limit check │
      │ │ ──► Redis │
      │ │ c. Verify JWT sig │
      │ │ d. Check blacklist │
      │ │ ──► Redis │
      │ │ e. Check expiry │
      │ │ f. Attach user to req │
      │ │ │
      │ │ 3. Controller handler │
      │ │ ──► SQL query │
      │ │ ───────────────────► │
      │ │ ◄─────────────────── │
      │ │ │
      │ 4. ApiResponse<T> │ │
      │ ◄────────────────────────────│ │
```

### 7.3 Post Feed Flow      │                                 │                            │
      │  3. POST /auth/google           │                            │
      │  ───────────────────────────►   │                            │
      │                                 │  4. Verify Google token    │
      │                                 │  (google-auth-library)     │
      │                                 │  5. Find/create user       │
      │                                 │  6. Create JWT pair        │
      │  7. Return tokens + user        │                            │
      │  ◄───────────────────────────   │                            │
```

### 7.2 Authenticated Request Flow

```
Mobile/Web Client                    API Server                    PostgreSQL / Redis
      │                                 │                            │
      │  1. Request with Bearer token   │                            │
      │  ───────────────────────────►   │                            │
      │                                 │                            │
      │                                 │  2. JwtAuthGuard:          │
      │                                 │     a. Extract token       │
      │                                 │     b. Rate limit check    │
      │                                 │     ──► Redis              │
      │                                 │     c. Verify JWT sig      │
      │                                 │     d. Check blacklist     │
      │                                 │     ──► Redis              │
      │                                 │     e. Check expiry        │
      │                                 │     f. Attach user to req  │
      │                                 │                            │
      │                                 │  3. Controller handler     │
      │                                 │     ──► SQL query          │
      │                                 │     ──────────────────►    │
      │                                 │     ◄──────────────────    │
      │                                 │                            │
      │  4. ApiResponse<T>              │                            │
      │  ◄───────────────────────────   │                            │
```

### 7.3 Post Feed Flow

```
Mobile Client                        API Server                    PostgreSQL
      │                                 │                            │
      │  GET /api/posts?page=1&limit=20 │                            │
      │  ───────────────────────────►   │                            │
      │                                 │  PostsService.getPosts()   │
      │                                 │  SQL: SELECT p.*, u.name   │
      │                                 │  FROM posts p               │
      │                                 │  JOIN user_profiles u       │
      │                                 │  ORDER BY created_at DESC  │
      │                                 │  LIMIT 20 OFFSET 0        │
      │                                 │  ──────────────────────►   │
      │                                 │  ◄──────────────────────   │
      │                                 │                            │
      │  ApiResponse<Post[]>            │                            │
      │  (with pagination metadata)     │                            │
      │  ◄───────────────────────────   │                            │
      │                                 │                            │
      │  Like: POST /api/posts/:id/like │                            │
      │  ───────────────────────────►   │                            │
      │                                 │  Toggle in post_likes      │
      │                                 │  Trigger updates count     │
      │  LikeResponse                   │                            │
      │  ◄───────────────────────────   │                            │
```

### 7.4 Statistics Caching Flow

```
Client                              API Server                    Redis         PostgreSQL
   │                                   │                            │               │
   │  GET /api/stats/community         │                            │               │
   │  ────────────────────────────►    │                            │               │
   │                                   │  1. Check Redis cache      │               │
   │                                   │  ─────────────────────►    │               │
   │                                   │                            │               │
   │                                   │  Cache HIT: return cached  │               │
   │  ◄────────────────────────────    │  ◄─────────────────────    │               │
   │                                   │                            │               │
   │  -- OR Cache MISS --              │                            │               │
   │                                   │  2. SQL aggregate queries  │               │
   │                                   │  ──────────────────────────────────────►   │
   │                                   │  ◄──────────────────────────────────────   │
   │                                   │  3. Map + compute          │               │
   │                                   │  4. Store in Redis (TTL)   │               │
   │                                   │  ─────────────────────►    │               │
   │  5. Return stats                  │                            │               │
   │  ◄────────────────────────────    │                            │               │
```

### 7.5 High-Anonymity Post → Operator Matching Flow (NEW)

```
Author (Mobile)          API Server               PostgreSQL          Operator (Mobile)
   │                        │                        │                     │
   │  1. Create post        │                        │                     │
   │  POST /api/posts       │                        │                     │
   │  { anonymity_level: 1, │                        │                     │
   │    title, description } │                        │                     │
   │  ─────────────────►    │                        │                     │
   │                        │  2. INSERT into posts   │                     │
   │                        │  (anonymity_level=1)   │                     │
   │                        │  ──────────────────►   │                     │
   │                        │  ◄──────────────────   │                     │
   │                        │                        │                     │
   │                        │  3. INSERT into         │                     │
   │                        │  matching_cases         │                     │
   │                        │  (status='unassigned')  │                     │
   │                        │  ──────────────────►   │                     │
   │                        │  ◄──────────────────   │                     │
   │                        │                        │                     │
   │                        │  4. Notify operators   │                     │
   │                        │  INSERT notification    │                     │
   │                        │  (type='operator_new    │                     │
   │                        │   _queue_item')        │                     │
   │                        │  ──────────────────►   │                     │
   │  5. Post created ack   │                        │                     │
   │  ◄─────────────────    │                        │                     │
   │                        │                        │                     │
   │                        │                        │  6. Operator polls  │
   │                        │                        │  notifications      │
   │                        │                        │  ◄─────────────────│
   │                        │                        │                     │
   │                        │                        │  7. GET /api/       │
   │                        │                        │  operator/queue     │
   │                        │  ◄──────────────────────────────────────────│
   │                        │  8. Return queue items │                     │
   │                        │  (full author identity) │                     │
   │                        │  ──────────────────────────────────────────►│
   │                        │                        │                     │
   │                        │                        │  9. Operator claims │
   │                        │                        │  PUT case status    │
   │                        │  ◄──────────────────────────────────────────│
   │                        │  10. UPDATE matching_  │                     │
   │                        │  cases SET status=     │                     │
   │                        │  'assigned', operator  │                     │
   │                        │  ──────────────────►   │                     │
   │                        │                        │                     │
   │                        │                        │  11. Operator       │
   │                        │                        │  proposes candidate │
   │                        │  ◄──────────────────────────────────────────│
   │                        │  12. INSERT into       │                     │
   │                        │  matching_candidates   │                     │
   │                        │  ──────────────────►   │                     │
   │                        │                        │                     │
   │                        │  13. Notify candidate  │                     │
   │                        │  + requester           │                     │
   │                        │  (scoped, anonymised)  │                     │
   │                        │  ──────────────────►   │                     │
   │  14. Author sees       │                        │                     │
   │  "match proposed"      │                        │                     │
   │  notification          │                        │                     │
   │  ◄─────────────────    │                        │                     │
   │                        │                        │                     │
   │  ... mutual acceptance / decline flow ...       │                     │
   │                        │                        │                     │
   │  15. On mutual accept: │                        │                     │
   │  both parties revealed │                        │                     │
   │  + optional chat       │                        │                     │
   │  created               │                        │                     │
```

---


### 7.6 Unified Give/Request Composer Flow (NEW)

```
Entry Point A (Bottom +) or Entry Point B (Receive CTA)
      │
      ▼
Open unified composer modal (85% height, dim backdrop)
      │
      ├─ Select intent (give/request)
      ├─ Select category
      └─ Fill dynamic category-aware fields
      │
      ▼
POST /api/dedicated-items (includes metadata intent)
      │
      ▼
Backend auto-creates posts row with metadata.intent
      │
      ▼
Feed mapping rules
  - all intents => Main feed
  - give       => Category give inventory
  - request    => Category Open Requests inventory (shown in give context)
```
