## BLOCKER + CRITICAL (remaining)

### API – typescript:S3776 (Cognitive Complexity)
- Issues in: `src/modules/*/controllers/*.controller.ts`, `src/modules/admin/services/admin-tables.service.ts`, `src/modules/admin/services/tasks.service.ts`, `src/database/database.init.ts`, `src/modules/items/services/items-delivery.service.ts`, `src/modules/sync/controllers/sync.controller.ts`, `src/modules/chat/controllers/chat.controller.ts`, `src/main.ts`, `src/modules/challenges/controllers/community-group-challenges.controller.ts`.
- **Note:** `users.controller.ts` was removed (split into `users-auth`, `users-follow`, `users-hierarchy`, `users-profile`, `users-stats` under `src/modules/users/controllers/`).
- **S3776 solution approach (recommended):**
  - **Rule:** Sonar flags functions whose cognitive complexity exceeds the threshold (default 15). Complexity is increased by conditionals, loops, nesting, and catch blocks.
  - **Strategy:** (1) **Thin controllers** – move “get from cache or fetch + cache + error handling” into a **facade (or service)** so each controller method is a single `return this.facade.getX(...)`. (2) **Extract methods** – replace long branches with small, well-named private or service methods. (3) **Early returns / guard clauses** – reduce nesting. (4) **Delegate writes** – move transaction logic (e.g. track visit, increment stat) into a small service so the controller only validates and calls.
  - **Example applied:** `stats.controller.ts` – added `StatsFacadeService` that owns cache key building, cache get/set, DB fetch, and error handling; controller delegates all read endpoints and reset to the facade. Write endpoints (track-visit, increment) stay in the controller but use the facade for cache invalidation; consider moving them to a `StatsWriteService` later for full consistency.

### API – plsql:S1192 (SQL string literals duplication)
- Issues in: `src/database/schema.sql`, `src/database/migration-unify-users.sql`, `migrations/add-hierarchy-levels.sql`, `migrations/add-ride-item-ids-to-posts.sql`, `src/database/migration-likes-comments.sql`, `src/database/seed-sample-challenges.sql`, `src/database/migration-add-missing-columns.sql`, `src/database/migration-fix-schema-sync.sql`.

### API – secrets:S6698
- 6 issues in: `src/scripts/fix-super-admins.ts`, `src/scripts/verify-hierarchy-migration.ts`, `jest.setup.js`, `src/scripts/add-google-id-column.ts`, `package.json`, `scripts/start-local-dev.sh`.

### API – typescript:S2068 (Hardcoded credentials)
- 3 issues in: `src/scripts/verify-separation.ts`, `src/shared/controllers/rate-limit.controller.ts`, `src/redis/redis.module.ts`.
- **Fixed:** `verify-separation.ts` – uses Nest Logger, no console; `redis.module.ts` – uses Nest Logger instead of console (project standard).

### API – plsql:LiteralsNonPrintableCharactersCheck (Non-printable characters in literals)
- 3 issues in: `src/database/schema.sql` (2), `src/database/migration-fix-schema-sync.sql` (1).

### API – typescript:S3504
- 2 issues (were in old `users.controller.ts`; may now be in `src/modules/users/controllers/*`).

### API – typescript:S2871
- 2 issues in: `src/modules/chat/controllers/chat.controller.ts`.

### API – json:S2068
- 1 issue in: `data-backups/20251224-162421/users.json` (1).


### Mobile – typescript:S3776 (Cognitive Complexity)
- Issues in: `bottomBarScreens/ProfileScreen.tsx`, `components/PostsReelsScreen.tsx`, `globals/responsive.ts`, `screens/LoginScreen.tsx`, `donationScreens/ItemsScreen.tsx`, `donationScreens/TrumpScreen.tsx`, `screens/AdminTasksScreen.tsx`, `screens/LandingSiteScreen.tsx`, `utils/chatService.ts`.

### Mobile – typescript:S2004
- 13 issues in: `donationScreens/ItemsScreen.tsx`, `hooks/useScrollPosition.ts`, `components/CommentsModal.tsx`, `bottomBarScreens/ProfileScreen.tsx`, `donationScreens/TrumpScreen.tsx`, `components/ScrollContainer.tsx`, `components/SearchBar.tsx`, `screens/BookmarksScreen.tsx`.

### Mobile – css:S4657
- 3 issues in: `web/index.html`.

### Mobile – typescript:S2871
- 2 issues in: `stores/userStore.ts`, `utils/chatService.ts`.

### Mobile – typescript:S7059
- 2 issues in: `utils/loggerService.ts`, `utils/enhancedDatabaseService.ts`.

### Mobile – secrets:S6334
- 1 issue in: `components/LocationSearchComp.tsx`.

### Mobile – javascript:S3776
- 1 issue in: `scripts/testAuth.js`.

---

## MAJOR (1083)

| Rule | Count | Description |
|------|-------|-------------|
| typescript:S3358 | 456 | Ternary operators – simplify or avoid |
| typescript:S1854 | 166 | Dead stores – unused variable assignments |
| typescript:S6582 | 115 | Prefer template literals over string concatenation |
| typescript:S125 | 53 | (see Sonar rule) |
| typescript:S7785 | 33 | (see Sonar rule) |
| typescript:S2933 | 33 | Class fields should be readonly |
| shelldre:S7688 | 23 | (see Sonar rule) |
| typescript:S6479 | 21 | (see Sonar rule) |
| shelldre:S7682 | 19 | (see Sonar rule) |
| shelldre:S7679 | 15 | (see Sonar rule) |
| typescript:S6590 | 15 | React props spreading |
| typescript:S6440 | 12 | (see Sonar rule) |
| typescript:S4165 | 11 | Empty array destructuring |
| typescript:S6660 | 11 | (see Sonar rule) |
| typescript:S6478 | 11 | (see Sonar rule) |

---

## Top files by issue count (API) – current paths

1. `src/modules/stats/controllers/stats.controller.ts`
2. `src/modules/users/controllers/*` (split from former users.controller)
3. `src/modules/admin/controllers/tasks.controller.ts`
4. `src/modules/posts/controllers/posts.controller.ts`
5. `src/modules/donations/controllers/donations.controller.ts`
6. `src/modules/auth/controllers/auth.controller.ts`
7. `scripts/copy-prod-to-dev.sh`
8. `src/modules/chat/controllers/chat.controller.ts`
9. `src/modules/sync/controllers/sync.controller.ts`
10. `src/main.ts`

---

## Top files by issue count (Mobile)

1. `screens/LoginScreen.tsx`
2. `screens/LandingSiteScreen.tsx`
3. `scripts/audit-all.ts`
4. `globals/responsive.ts`
5. `components/PostsReelsScreen.tsx`
6. `bottomBarScreens/ProfileScreen.tsx`
7. `screens/Landing/styles/index.ts`
8. `components/FloatingBubblesSkia.tsx`

---

## MINOR + INFO (1704)

- Unused imports, dead stores, TODO/FIXME comments, style issues.
- Fix incrementally; re-run Sonar report script after scan for current counts.
*Updated to reflect current codebase (modules layout, resolved S5145, removed/deleted files). Run: `SONAR_TOKEN=xxx node scripts/sonar-analysis/sonar-report.js` (or in CI after SonarCloud Scan) for fresh counts.*
