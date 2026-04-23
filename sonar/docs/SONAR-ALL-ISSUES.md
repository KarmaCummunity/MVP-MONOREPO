# SonarCloud – All Issues (single reference)

Generated: 2026-02-26T13:13:43.459Z

Refresh: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.

---

## 1. Summary

| Project | Total | BLOCKER | CRITICAL | MAJOR | MINOR | INFO |
|---------|-------|---------|----------|-------|-------|------|
| **API** | 932 | 11 | 105 | 196 | 521 | 99 |
| **Mobile** | 2159 | 1 | 110 | 901 | 831 | 316 |
| **Total** | **3091** | **12** | **215** | **1097** | - | - |

---

## 2. BLOCKER + CRITICAL (227)

### API – typescript:S3776 (Cognitive Complexity)
- 71 issues in: `src/controllers/users.controller.ts` (12), `src/controllers/posts.controller.ts` (9), `src/controllers/tasks.controller.ts` (5), `src/database/database.init.ts` (4), `src/modules/admin/services/tasks.service.ts` (4), `src/modules/users/services/user-hierarchy.service.ts` (4), `src/services/admin-tables.service.ts` (4), `src/main.ts` (3), `src/controllers/items-delivery.service.ts` (3), `src/controllers/sync.controller.ts` (3).

### API – plsql:S1192 (SQL string literals duplication)
- 27 issues in: `src/database/schema.sql` (12), `src/database/migration-unify-users.sql` (4), `migrations/add-hierarchy-levels.sql` (3), `migrations/add-ride-item-ids-to-posts.sql` (2), `src/database/migration-likes-comments.sql` (2), `src/database/seed-sample-challenges.sql` (1), `src/database/migration-add-missing-columns.sql` (1), `src/database/migration-fix-schema-sync.sql` (1), `check-and-fix-items-table.sql` (1).

### API – secrets:S6698 ((see Sonar rule))
- 6 issues in: `src/scripts/fix-super-admins.ts` (1), `src/scripts/verify-hierarchy-migration.ts` (1), `jest.setup.js` (1), `src/scripts/add-google-id-column.ts` (1), `package.json` (1), `scripts/start-local-dev.sh` (1).

### API – typescript:S2068 ((see Sonar rule))
- 4 issues in: `src/shared/controllers/rate-limit.controller.ts` (2), `src/scripts/verify-separation.ts` (1), `src/redis/redis.module.ts` (1).

### API – plsql:LiteralsNonPrintableCharactersCheck (Non-printable characters in literals)
- 3 issues in: `src/database/schema.sql` (2), `src/database/migration-fix-schema-sync.sql` (1).

### API – typescript:S3504 ((see Sonar rule))
- 2 issues in: `src/controllers/users.controller.ts` (2).

### API – typescript:S2871 ((see Sonar rule))
- 2 issues in: `src/controllers/chat.controller.ts` (2).

### API – json:S2068 ((see Sonar rule))
- 1 issues in: `data-backups/20251224-162421/users.json` (1).

### API – tssecurity:S5145 (Vulnerability)
- Change this code to not log user-controlled data. – e.g. `src/minimal-server.ts`

### API – jssecurity:S5145 (Vulnerability)
- Change this code to not log user-controlled data. – e.g. `minimal-server.js`

### Mobile – typescript:S3776 (Cognitive Complexity)
- 89 issues in: `bottomBarScreens/ProfileScreen.tsx` (9), `components/PostsReelsScreen.tsx` (6), `globals/responsive.ts` (5), `screens/LoginScreen.tsx` (4), `donationScreens/ItemsScreen.tsx` (3), `donationScreens/TrumpScreen.tsx` (3), `screens/AdminTasksScreen.tsx` (3), `screens/LandingSiteScreen.legacy.tsx` (3), `screens/LandingSiteScreen.tsx` (3), `utils/chatService.ts` (3).

### Mobile – typescript:S2004 ((see Sonar rule))
- 13 issues in: `donationScreens/ItemsScreen.tsx` (5), `hooks/useScrollPosition.ts` (2), `components/CommentsModal.tsx` (1), `bottomBarScreens/ProfileScreen.tsx` (1), `donationScreens/TrumpScreen.tsx` (1), `components/ScrollContainer.tsx` (1), `components/SearchBar.tsx` (1), `screens/BookmarksScreen.tsx` (1).

### Mobile – css:S4657 ((see Sonar rule))
- 3 issues in: `web/index.html` (3).

### Mobile – typescript:S2871 ((see Sonar rule))
- 2 issues in: `stores/userStore.ts` (1), `utils/chatService.ts` (1).

### Mobile – typescript:S7059 ((see Sonar rule))
- 2 issues in: `utils/loggerService.ts` (1), `utils/enhancedDatabaseService.ts` (1).

### Mobile – secrets:S6334 ((see Sonar rule))
- 1 issues in: `components/LocationSearchComp.tsx` (1).

### Mobile – javascript:S3776 ((see Sonar rule))
- 1 issues in: `scripts/testAuth.js` (1).

---

## 3. MAJOR (1097)

| Rule | Count | Description |
|------|-------|-------------|
| typescript:S3358 | 457 | Ternary operators – simplify or avoid |
| typescript:S1854 | 166 | Dead stores – unused variable assignments |
| typescript:S6582 | 124 | Prefer template literals over string concatenation |
| typescript:S125 | 53 | (see Sonar rule) |
| typescript:S7785 | 33 | (see Sonar rule) |
| typescript:S2933 | 33 | Class fields should be readonly |
| shelldre:S7688 | 23 | (see Sonar rule) |
| typescript:S6479 | 21 | (see Sonar rule) |
| shelldre:S7682 | 19 | (see Sonar rule) |
| shelldre:S7679 | 15 | (see Sonar rule) |
| typescript:S6590 | 15 | React props spreading |
| typescript:S6660 | 12 | (see Sonar rule) |
| typescript:S4165 | 12 | Empty array destructuring |
| typescript:S6440 | 12 | (see Sonar rule) |
| typescript:S6478 | 11 | (see Sonar rule) |

---

## 4. Top files by issue count (API)

1. `src/controllers/stats.controller.ts` – 197  
2. `src/controllers/users.controller.ts` – 71  
3. `src/controllers/tasks.controller.ts` – 48  
4. `src/controllers/posts.controller.ts` – 46  
5. `src/controllers/donations.controller.ts` – 29  
6. `scripts/copy-prod-to-dev.sh` – 26  
7. `src/controllers/chat.controller.ts` – 24  
8. `src/main.ts` – 22  
9. `src/modules/admin/services/tasks.service.ts` – 21  
10. `src/controllers/sync.controller.ts` – 21  

---

## 5. Top files by issue count (Mobile)

1. `screens/LoginScreen.tsx` – 126  
2. `screens/LandingSiteScreen.tsx` – 94  
3. `screens/LandingSiteScreen.legacy.tsx` – 92  
4. `scripts/audit-all.ts` – 82  
5. `globals/responsive.ts` – 74  
6. `components/PostsReelsScreen.tsx` – 69  
7. `bottomBarScreens/ProfileScreen.tsx` – 57  
8. `screens/Landing/styles/index.ts` – 51  
9. `components/FloatingBubblesSkia.tsx` – 48  
10. `bottomBarScreens/HomeScreenOld.tsx` – 45  

---

## 6. MINOR + INFO (1767)

- Unused imports, dead stores, TODO/FIXME comments, style issues.
- Fix incrementally; re-run this script after Sonar for current counts.

---

*Generated from SonarCloud. Run: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.*
