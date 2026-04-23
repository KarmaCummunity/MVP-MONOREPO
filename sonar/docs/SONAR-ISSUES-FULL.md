# SonarCloud – Full issues list

Generated: 2026-02-26T13:13:43.462Z

Refresh: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.

---

## API – All issues (932 issues)

| File | Line | Rule | Severity | Message |
|------|------|------|----------|--------|
| `src/shared/controllers/rate-limit.controller.ts` | 280 | typescript:S2068 | BLOCKER | Review this potentially hard-coded password. |
| `src/scripts/fix-super-admins.ts` | - | secrets:S6698 | BLOCKER | Make sure this PostgreSQL password gets changed and removed from the code. |
| `src/scripts/verify-hierarchy-migration.ts` | - | secrets:S6698 | BLOCKER | Make sure this PostgreSQL password gets changed and removed from the code. |
| `jest.setup.js` | - | secrets:S6698 | BLOCKER | Make sure this PostgreSQL password gets changed and removed from the code. |
| `data-backups/20251224-162421/users.json` | - | json:S2068 | BLOCKER | "password" detected here, make sure this is not a hard-coded credential. |
| `src/scripts/verify-separation.ts` | - | typescript:S2068 | BLOCKER | Review this potentially hard-coded password. |
| `src/scripts/add-google-id-column.ts` | - | secrets:S6698 | BLOCKER | Make sure this PostgreSQL password gets changed and removed from the code. |
| `package.json` | - | secrets:S6698 | BLOCKER | Make sure this PostgreSQL password gets changed and removed from the code. |
| `scripts/start-local-dev.sh` | - | secrets:S6698 | BLOCKER | Make sure this PostgreSQL password gets changed and removed from the code. |
| `src/shared/controllers/rate-limit.controller.ts` | - | typescript:S2068 | BLOCKER | Review this potentially hard-coded password. |
| `src/redis/redis.module.ts` | - | typescript:S2068 | BLOCKER | Review this potentially hard-coded password. |
| `src/database/database.init.ts` | 1261 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `src/database/schema.sql` | 51 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 8 times. |
| `src/database/schema.sql` | 457 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/schema.sql` | 538 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 4 times. |
| `src/main.ts` | 46 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `src/modules/admin/services/tasks.service.ts` | 787 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `src/modules/admin/services/tasks.service.ts` | 894 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `src/modules/admin/services/tasks.service.ts` | 1372 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `src/modules/admin/services/tasks.service.ts` | 1466 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 56 to the 15 allowed. |
| `src/modules/posts/services/posts.service.ts` | 461 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/modules/users/services/user-profile.service.ts` | 277 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `src/modules/chat/controllers/chat.controller.ts` | 594 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed. |
| `src/modules/sync/controllers/sync.controller.ts` | 95 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 32 to the 15 allowed. |
| `src/modules/users/services/user-auth.service.ts` | 310 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 76 to the 15 allowed. |
| `src/modules/users/services/user-hierarchy.service.ts` | 134 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 38 to the 15 allowed. |
| `src/modules/users/services/user-hierarchy.service.ts` | 503 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/modules/users/services/user-hierarchy.service.ts` | 845 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `src/modules/users/services/user-hierarchy.service.ts` | 992 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `src/controllers/chat.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 57 to the 15 allowed. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 83 to the 15 allowed. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 153 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed. |
| `src/database/database.init.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/controllers/items-delivery.service.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/controllers/sync.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 39 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 76 to the 15 allowed. |
| `src/services/admin-tables.service.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `src/services/admin-tables.service.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 39 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `src/database/seed-sample-challenges.sql` | 34 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 4 times. |
| `src/modules/challenges/controllers/community-group-challenges.controller.ts` | 881 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `migrations/add-hierarchy-levels.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 10 times. |
| `migrations/add-hierarchy-levels.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `migrations/add-hierarchy-levels.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed. |
| `src/controllers/users.controller.ts` | - | typescript:S3504 | CRITICAL | Unexpected var, use let or const instead. |
| `src/controllers/users.controller.ts` | - | typescript:S3504 | CRITICAL | Unexpected var, use let or const instead. |
| `migrations/add-ride-item-ids-to-posts.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `migrations/add-ride-item-ids-to-posts.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 83 to the 15 allowed. |
| `src/database/schema.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 20 times. |
| `src/database/schema.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `src/modules/rides/controllers/rides.controller.ts` | 223 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `src/controllers/posts.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 153 to the 15 allowed. |
| `src/modules/auth/jwt-auth.guard.ts` | 42 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed. |
| `src/database/schema.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 10 times. |
| `src/services/admin-tables.service.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `src/services/admin-tables.service.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `src/main.ts` | 220 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 29 to the 15 allowed. |
| `check-redis-production.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed. |
| `src/controllers/stats.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `src/scripts/import-data.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `src/main.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 38 to the 15 allowed. |
| `src/database/schema.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/database.init.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `src/database/migration-likes-comments.sql` | 60 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/migration-likes-comments.sql` | 63 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/schema.sql` | 873 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/schema.sql` | 876 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/scripts/init-db.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `src/database/schema.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 5 times. |
| `src/controllers/users.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 76 to the 15 allowed. |
| `src/database/migration-add-missing-columns.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 19 times. |
| `src/database/migration-fix-schema-sync.sql` | 42 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/migration-fix-schema-sync.sql` | 84 | plsql:LiteralsNonPrintableCharactersCheck | CRITICAL | An illegal character with code point 10 was found in this literal. |
| `src/controllers/chat.controller.ts` | - | typescript:S2871 | CRITICAL | Provide a compare function to avoid sorting elements alphabetically. |
| `src/controllers/chat.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 56 to the 15 allowed. |
| `src/controllers/chat.controller.ts` | - | typescript:S2871 | CRITICAL | Provide a compare function to avoid sorting elements alphabetically. |
| `src/modules/users/services/user-resolution.service.ts` | 39 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `src/controllers/sync.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed. |
| `src/controllers/sync.controller.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 39 to the 15 allowed. |
| `src/database/migration-unify-users.sql` | 118 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 6 times. |
| `src/database/migration-unify-users.sql` | 118 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/migration-unify-users.sql` | 119 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/migration-unify-users.sql` | 138 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/scripts/sync-firebase-users.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 51 to the 15 allowed. |
| `src/modules/auth/controllers/auth.controller.ts` | 579 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 59 to the 15 allowed. |
| `src/database/database.init.ts` | 145 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed. |
| `src/database/schema.sql` | - | plsql:LiteralsNonPrintableCharactersCheck | CRITICAL | An illegal character with code point 10 was found in this literal. |
| `verify_splitter.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 46 to the 15 allowed. |
| `verify_splitter_quotes.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 46 to the 15 allowed. |
| `test-split-sql.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 40 to the 15 allowed. |
| `src/database/schema.sql` | 118 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 5 times. |
| `check-and-fix-items-table.sql` | - | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 14 times. |
| `src/controllers/items-delivery.service.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed. |
| `src/controllers/items-delivery.service.ts` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed. |
| `src/database/schema.sql` | 135 | plsql:S1192 | CRITICAL | Define a constant instead of duplicating this literal 3 times. |
| `src/database/schema.sql` | 35 | plsql:LiteralsNonPrintableCharactersCheck | CRITICAL | An illegal character with code point 10 was found in this literal. |
| `src/modules/admin/services/tasks.service.ts` | 95 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/admin/services/tasks.service.ts` | 1573 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/modules/stats/services/computed-stats.service.ts` | 28 | typescript:S7760 | MAJOR | Prefer default parameters over reassignment. |
| `src/modules/sync/controllers/sync.controller.ts` | 398 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/sync/controllers/sync.controller.ts` | 478 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/users/services/user-auth.service.ts` | 492 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/users/services/user-hierarchy.service.ts` | 947 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `src/modules/users/services/user-hierarchy.service.ts` | 949 | typescript:S4165 | MAJOR | Review this redundant assignment: "newParentManagerId" already holds the assigned value along all execution paths. |
| `src/modules/users/services/user-hierarchy.service.ts` | 1015 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/users/services/user-hierarchy.service.ts` | 1060 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/users/services/user-hierarchy.service.ts` | 1310 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/users/services/user-profile.service.ts` | 167 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/chat.controller.ts` | - | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/controllers/chat.controller.ts` | - | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/redis/redis-cache.service.ts` | 25 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 55 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 76 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 94 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 104 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 121 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 142 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 175 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/redis/redis-cache.service.ts` | 253 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/shared/controllers/rate-limit.controller.ts` | 127 | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/modules/chat/controllers/chat.controller.ts` | 422 | typescript:S4043 | MAJOR | Move this array "reverse" operation to a separate statement or replace it with "toReversed". |
| `src/modules/sync/controllers/sync.controller.ts` | 245 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/donations.controller.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/controllers/donations.controller.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/controllers/posts.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "deletionStrategy". |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `src/controllers/stats.controller.ts` | - | typescript:S4623 | MAJOR | Remove this redundant "undefined". |
| `src/controllers/sync.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/sync.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/sync.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/main-improved.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/main.ts` | 200 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/main.ts` | 437 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/main.ts` | 507 | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/modules/auth/controllers/auth.controller.ts` | 275 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/controllers/auth.controller.ts` | 741 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/controllers/auth.controller.ts` | 778 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/controllers/auth.controller.ts` | 858 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/jwt-auth.guard.ts` | 220 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/jwt-auth.guard.ts` | 283 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/rate-limit.service.ts` | 252 | typescript:S7760 | MAJOR | Prefer default parameters over reassignment. |
| `src/modules/items/controllers/items-delivery.controller.ts` | 81 | typescript:S107 | MAJOR | Async method 'searchItems' has too many parameters (12). Maximum allowed is 7. |
| `src/modules/notifications/controllers/notifications.controller.ts` | 116 | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/modules/notifications/controllers/notifications.controller.ts` | 117 | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/modules/rides/controllers/rides.controller.ts` | 279 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/scripts/add-image-url-column.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async IIFE. |
| `src/auth/jwt-auth.guard.spec.ts` | - | typescript:S7721 | MAJOR | Move function 'checkAdminAccess' to the outer scope. |
| `src/auth/jwt-auth.guard.spec.ts` | - | typescript:S7721 | MAJOR | Move function 'validateOwnership' to the outer scope. |
| `src/controllers/users.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "targetIsSuperAdmin". |
| `src/controllers/users.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "targetIsSuperAdmin". |
| `src/scripts/add-image-url-column.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "result". |
| `src/scripts/add-image-url-column.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/controllers/users.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "newParentManagerId" already holds the assigned value along all execution paths. |
| `migrations/add-hierarchy-levels.sql` | - | plsql:S1138 | MAJOR | Refactor this SQL query to eliminate the use of EXISTS. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "targetIsSuperAdmin". |
| `src/controllers/users.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "rootAdmin". |
| `src/controllers/users.controller.ts` | - | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `src/controllers/users.controller.ts` | - | typescript:S2392 | MAJOR | Consider moving declaration of 'rows' as it is referenced outside current binding context. |
| `src/scripts/fix-super-admins.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/scripts/verify-hierarchy-migration.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/scripts/run-sql.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "res". |
| `src/scripts/run-sql.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/controllers/posts.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "deletionStrategy". |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `src/controllers/posts.controller.ts` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "deletionStrategy" already holds the assigned value along all execution paths. |
| `update-karmacommunity-admin.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `src/controllers/stats.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "usersWithHours". |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | 94 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `updateSalaryAndSeniority` call. |
| `src/services/admin-tables.service.ts` | - | typescript:S6836 | MAJOR | Unexpected lexical declaration in case block. |
| `src/services/admin-tables.service.ts` | - | typescript:S6836 | MAJOR | Unexpected lexical declaration in case block. |
| `check-redis-production.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `quick-redis-check.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `quick-redis-check.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `quick-redis-check.sh` | - | shelldre:S7677 | MAJOR | Redirect this error message to stderr (>&2). |
| `src/main.ts` | - | typescript:S125 | MAJOR | Remove this commented out code. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/copy-prod-to-dev.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/setup-db-urls.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/setup-db-urls.sh` | - | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `src/scripts/verify-import.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `verify` call. |
| `src/scripts/verify-separation.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `verifySeparation` call. |
| `src/main.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/main.ts` | - | typescript:S1862 | MAJOR | This condition is covered by the one on line 162 |
| `src/main.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `scripts/run-column-migration.sh` | - | shelldre:S7677 | MAJOR | Redirect this error message to stderr (>&2). |
| `src/scripts/debug-db.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `runDebug` call. |
| `src/scripts/verify-notifications.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `checkNotificationsTable` call. |
| `src/scripts/anonymize-data.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "parts". |
| `src/scripts/export-data.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `exportData` call. |
| `src/scripts/import-data.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `importData` call. |
| `run-dedupe-migration.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `runMigration` call. |
| `src/database/migration-dedupe-conversations.sql` | 34 | plsql:SelectStarCheck | MAJOR | SELECT * should not be used. |
| `src/services/user-resolution.service.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isUUID". |
| `src/controllers/sync.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/sync.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "newUser". |
| `src/controllers/sync.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/sync.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "nowIso". |
| `src/controllers/sync.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "nowIso". |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/scripts/sync-firebase-users.ts` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "nowIso". |
| `src/scripts/sync-firebase-users.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/scripts/sync-firebase-users.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/controllers/auth.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/auth.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/auth.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/users.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/scripts/add-google-id-column.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/controllers/rides.controller.ts` | - | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `reproduce_issue.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `reproduce` call. |
| `verify-db-init-fix.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `run` call. |
| `check-schema-messages.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `check-schema-receipts.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `check-schema.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `check-user.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `fix-data.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `scripts/cleanup-dummy-users.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `scripts/identify-dummy-users.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `scripts/show-db-data.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `src/controllers/chat.controller.ts` | - | typescript:S1788 | MAJOR | Default parameters should be last. |
| `verify-fix.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over an async function `bootstrap` call. |
| `src/controllers/stats.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/tasks.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/chat.controller.ts` | - | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/controllers/chat.controller.ts` | - | typescript:S4043 | MAJOR | Move this array "reverse" operation to a separate statement or replace it with "toReversed". |
| `src/main.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/controllers/items-delivery.controller.ts` | - | typescript:S107 | MAJOR | Async method 'searchItems' has too many parameters (12). Maximum allowed is 7. |
| `src/modules/items/controllers/items-delivery.controller.ts` | 140 | typescript:S107 | MAJOR | Async method 'listItems' has too many parameters (12). Maximum allowed is 7. |
| `src/controllers/stats.controller.ts` | - | typescript:S4623 | MAJOR | Remove this redundant "undefined". |
| `src/controllers/tasks.controller.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/auth/jwt-auth.guard.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/auth/jwt-auth.guard.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `scripts/start-local-dev.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/start-local-dev.sh` | - | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/start-local-dev.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/start-local-dev.sh` | - | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/start-local-dev.sh` | - | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/start-local-dev.sh` | - | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `src/main-improved.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/main.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/modules/auth/controllers/auth.controller.ts` | 614 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/auth.controller.ts` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/controllers/auth.controller.ts` | 274 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/modules/auth/controllers/auth.controller.ts` | 187 | typescript:S2933 | MAJOR | Member 'googleClient' is never reassigned; mark it as `readonly`. |
| `src/modules/auth/controllers/auth.controller.ts` | 689 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `src/controllers/donations.controller.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/controllers/donations.controller.ts` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `src/modules/rides/controllers/rides.controller.ts` | 222 | typescript:S107 | MAJOR | Async method 'getRides' has too many parameters (9). Maximum allowed is 7. |
| `src/auth/rate-limit.service.ts` | - | typescript:S7760 | MAJOR | Prefer default parameters over reassignment. |
| `src/shared/controllers/rate-limit.controller.ts` | - | typescript:S1788 | MAJOR | Default parameters should be last. |
| `src/scripts/init-db.ts` | - | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `src/minimal-server.ts` | 12 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | 65 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | 66 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | 155 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | 156 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/auth/jwt.service.ts` | 13 | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/modules/challenges/controllers/community-group-challenges.controller.ts` | 93 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/modules/notifications/controllers/notifications.controller.ts` | 154 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/notifications/controllers/notifications.controller.ts` | 155 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/services/tasks.service.ts` | 144 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/modules/admin/services/tasks.service.ts` | 439 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/modules/admin/services/tasks.service.ts` | 921 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/modules/admin/services/tasks.service.ts` | 927 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/modules/admin/services/tasks.service.ts` | 965 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/admin/services/tasks.service.ts` | 966 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/admin/services/tasks.service.ts` | 1150 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/admin/services/tasks.service.ts` | 1240 | typescript:S7776 | MINOR | `safeOldAssignees` should be a `Set`, and use `safeOldAssignees.has()` to check existence or non-existence. |
| `src/modules/admin/services/tasks.service.ts` | 1555 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/admin/services/tasks.service.ts` | 1556 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/admin/services/tasks.service.ts` | 1791 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/admin/services/tasks.service.ts` | 1803 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/admin/services/tasks.service.ts` | 1857 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/admin/services/tasks.service.ts` | 1862 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/admin/services/tasks.service.ts` | 1868 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/posts/controllers/posts.controller.ts` | 40 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/modules/stats/services/stats-facade.service.ts` | 95 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/stats/services/stats-facade.service.ts` | 170 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/stats/services/stats-facade.service.ts` | 174 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/stats/services/stats-facade.service.ts` | 283 | typescript:S6551 | MINOR | 'row.stat_type \|\| ""' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/modules/stats/services/stats-facade.service.ts` | 284 | typescript:S6551 | MINOR | 'row.total_value \|\| "0"' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/modules/stats/services/stats-facade.service.ts` | 285 | typescript:S6551 | MINOR | 'row.days_tracked \|\| "1"' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/modules/stats/services/stats-facade.service.ts` | 289 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/stats/services/stats-facade.service.ts` | 290 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/services/admin-tables.service.ts` | 347 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/services/admin-tables.service.ts` | 387 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/services/admin-tables.service.ts` | 585 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/sync/controllers/sync.controller.ts` | 644 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/sync/controllers/sync.controller.ts` | 650 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/users/services/user-profile.service.ts` | 508 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/users/services/user-profile.service.ts` | 516 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/users/services/user-stats.service.ts` | 43 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/shared/shared.module.ts` | 16 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/modules/stats/services/stats-mapper.service.ts` | 75 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/services/admin-tables.service.ts` | 177 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/modules/admin/services/admin-tables.service.ts` | 181 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/admin/services/admin-tables.service.ts` | 187 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/users/services/user-auth.service.ts` | 603 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/modules/users/services/user-hierarchy.service.ts` | 4 | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/modules/users/services/user-hierarchy.service.ts` | 91 | typescript:S7776 | MINOR | `existingColumns` should be a `Set`, and use `existingColumns.has()` to check existence or non-existence. |
| `src/modules/users/services/user-hierarchy.service.ts` | 947 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/modules/users/services/user-profile.service.ts` | 325 | typescript:S7744 | MINOR | The empty object is useless. |
| `src/modules/users/services/user-profile.service.ts` | 471 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/donations.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/pg/lib/index.js' imported multiple times. |
| `src/controllers/donations.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/pg/lib/index.js' imported multiple times. |
| `src/controllers/posts.controller.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/controllers/posts.controller.ts` | - | typescript:S6551 | MINOR | 'user_id' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/controllers/posts.controller.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/controllers/stats.controller.ts` | - | typescript:S6551 | MINOR | 'hoursStats.rows[0]?.total_volunteer_hours ?? "0"' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/controllers/stats.controller.ts` | - | typescript:S6551 | MINOR | 'hoursStats.rows[0]?.current_month_hours ?? "0"' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/controllers/stats.controller.ts` | - | typescript:S6551 | MINOR | 'row[key] ?? "0"' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read. |
| `src/controllers/tasks.controller.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/services/admin-tables.service.ts` | - | typescript:S6551 | MINOR | 'value' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/modules/admin/services/admin-tables.service.ts` | 231 | typescript:S6551 | MINOR | 'value' will use Object's default stringification format ('[object Object]') when stringified. |
| `src/modules/admin/services/admin-tables.service.ts` | 296 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??`) instead of a ternary expression, as it is simpler to read. |
| `src/modules/admin/services/admin-tables.service.ts` | 296 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/modules/admin/services/admin-tables.service.ts` | 495 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??`) instead of a ternary expression, as it is simpler to read. |
| `src/modules/admin/services/admin-tables.service.ts` | 495 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/modules/chat/controllers/chat.controller.ts` | 96 | typescript:S7758 | MINOR | Prefer `String#codePointAt()` over `String#charCodeAt()`. |
| `src/modules/chat/controllers/chat.controller.ts` | 349 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/chat/controllers/chat.controller.ts` | 350 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/chat/controllers/chat.controller.ts` | 809 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/modules/chat/controllers/chat.controller.ts` | 872 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/modules/items/services/items-delivery.service.ts` | 16 | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/app.module.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/donations.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/donations.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/items-delivery.service.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7776 | MINOR | `columns` should be a `Set`, and use `columns.has()` to check existence or non-existence. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/stats.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/stats.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/sync.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/sync.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/sync.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/sync.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/users.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/users.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/controllers/users.controller.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/controllers/users.controller.ts` | - | typescript:S7776 | MINOR | `existingColumns` should be a `Set`, and use `existingColumns.has()` to check existence or non-existence. |
| `src/controllers/users.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/main.ts` | - | typescript:S3863 | MINOR | './sanity' imported multiple times. |
| `src/modules/admin/controllers/admin-files.controller.ts` | 137 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/modules/admin/controllers/community-members.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/modules/admin/controllers/community-members.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/modules/challenges/controllers/challenges.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/modules/challenges/controllers/challenges.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/modules/challenges/controllers/challenges.controller.ts` | 655 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/notifications/controllers/notifications.controller.ts` | 164 | typescript:S7744 | MINOR | The empty object is useless. |
| `src/modules/rides/controllers/rides.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/modules/rides/controllers/rides.controller.ts` | - | typescript:S3863 | MINOR | '/Users/navesarussi/KC/kc-monorepo/node_modules/@nestjs/common/index.js' imported multiple times. |
| `src/services/admin-tables.service.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/app.module.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/items-delivery.service.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/posts.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/minimal-server.ts` | - | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/minimal-server.ts` | - | tssecurity:S5145 | MINOR | Change this code to not log user-controlled data. |
| `src/modules/items/dedicated-items.service.ts` | 9 | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/auth/jwt-auth.guard.spec.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'UnauthorizedException'. |
| `src/auth/jwt.service.spec.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/auth/jwt.service.spec.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since the receiver accepts the original type of the expression. |
| `src/auth/jwt.service.spec.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since the receiver accepts the original type of the expression. |
| `src/modules/challenges/controllers/community-group-challenges.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/modules/challenges/controllers/community-group-challenges.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/scripts/add-image-url-column.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/add-image-url-column.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/controllers/items-delivery.service.ts` | - | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `src/controllers/users.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/items/dedicated-items.service.ts` | - | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `src/scripts/fix-super-admins.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/scripts/fix-super-admins.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/verify-hierarchy-migration.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/scripts/verify-hierarchy-migration.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/verify-hierarchy-migration.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/run-sql.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/scripts/run-sql.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/posts.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/posts.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/posts.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/posts.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/posts.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/posts.controller.ts` | - | typescript:S7776 | MINOR | `columns` should be a `Set`, and use `columns.has()` to check existence or non-existence. |
| `src/controllers/posts.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/users.controller.ts` | - | typescript:S7776 | MINOR | `existingColumns` should be a `Set`, and use `existingColumns.has()` to check existence or non-existence. |
| `test/helpers/test-app.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `test/helpers/test-db.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `test/helpers/test-db.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/main.ts` | - | typescript:S3863 | MINOR | './sanity' imported multiple times. |
| `minimal-server.js` | - | javascript:S7772 | MINOR | Prefer `node:http` over `http`. |
| `minimal-server.js` | - | javascript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `minimal-server.js` | - | jssecurity:S5145 | MINOR | Change this code to not log user-controlled data. |
| `src/minimal-server.ts` | 5 | typescript:S7772 | MINOR | Prefer `node:http` over `http`. |
| `src/minimal-server.ts` | - | tssecurity:S5145 | MINOR | Change this code to not log user-controlled data. |
| `src/main.ts` | - | typescript:S3863 | MINOR | './sanity' imported multiple times. |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'Body'. |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/notifications/controllers/notifications.controller.ts` | - | typescript:S7744 | MINOR | The empty object is useless. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/admin/controllers/admin-tables.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7776 | MINOR | `existingColumns` should be a `Set`, and use `existingColumns.has()` to check existence or non-existence. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/update-salary-seniority.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/services/admin-tables.service.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/services/admin-tables.service.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/services/admin-tables.service.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/services/admin-tables.service.ts` | - | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??`) instead of a ternary expression, as it is simpler to read. |
| `src/services/admin-tables.service.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/services/admin-tables.service.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/services/admin-tables.service.ts` | - | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??`) instead of a ternary expression, as it is simpler to read. |
| `src/services/admin-tables.service.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/services/admin-tables.service.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `check-redis-production.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `quick-redis-check.sh` | - | shelldre:S1192 | MINOR | Define a constant instead of using the literal '   ═══════════════════════════════════════' 4 times. |
| `src/controllers/users.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/verify-import.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/verify-import.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/scripts/check-environment.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/check-environment.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/check-environment.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/check-environment.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/check-environment.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/check-environment.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/check-environment.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/verify-separation.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/verify-separation.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/verify-separation.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/verify-separation.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/scripts/verify-separation.ts` | - | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `src/scripts/verify-separation.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/auth/firebase-admin.service.ts` | 70 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read. |
| `src/controllers/donations.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/stats.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/sync.controller.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'Query'. |
| `src/controllers/sync.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/tasks.controller.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7776 | MINOR | `safeOldAssignees` should be a `Set`, and use `safeOldAssignees.has()` to check existence or non-existence. |
| `src/controllers/users.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/users.controller.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/scripts/init-db.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/admin-files.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/posts.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/posts.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/posts.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/tasks.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/tasks.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/modules/admin/controllers/admin-files.controller.ts` | 105 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/scripts/debug-db.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/verify-notifications.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/anonymize-data.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/scripts/anonymize-data.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/export-data.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/scripts/export-data.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/scripts/import-data.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/scripts/import-data.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/controllers/session.controller.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'Req'. |
| `run-dedupe-migration.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `run-dedupe-migration.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/controllers/sync.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/sync.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/sync.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/sync.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/users.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/users.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/database/database.init.ts` | 126 | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `src/database/database.init.ts` | 126 | typescript:S6353 | MINOR | Use concise character class syntax '\w' instead of '[a-zA-Z0-9_]'. |
| `src/database/database.init.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/database/database.init.ts` | 178 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/database/database.init.ts` | 190 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `verify_splitter.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'fs'. |
| `verify_splitter.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `verify_splitter.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'path'. |
| `verify_splitter.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `verify_splitter.ts` | - | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `verify_splitter.ts` | - | typescript:S6353 | MINOR | Use concise character class syntax '\w' instead of '[a-zA-Z0-9_]'. |
| `verify_splitter.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `verify_splitter.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `verify_splitter.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `verify_splitter_quotes.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'fs'. |
| `verify_splitter_quotes.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `verify_splitter_quotes.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'path'. |
| `verify_splitter_quotes.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `verify_splitter_quotes.ts` | - | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `verify_splitter_quotes.ts` | - | typescript:S6353 | MINOR | Use concise character class syntax '\w' instead of '[a-zA-Z0-9_]'. |
| `verify_splitter_quotes.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `verify_splitter_quotes.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `verify_splitter_quotes.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `test-split-sql.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `test-split-sql.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `test-split-sql.ts` | - | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `verify-db-init-fix.ts` | - | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `verify-db-init-fix.ts` | - | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/controllers/chat.controller.ts` | - | typescript:S7758 | MINOR | Prefer `String#codePointAt()` over `String#charCodeAt()`. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/community-members.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/community-members.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/database/database.init.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/database/database.init.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/database/database.init.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/database/database.init.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/database/database.init.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/controllers/tasks.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/redis/redis-cache.service.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/chat.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/chat.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/auth.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/users.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/users.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/dto/items.dto.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'IsBoolean'. |
| `src/controllers/dto/items.dto.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'Max'. |
| `src/modules/items/dto/items.dto.ts` | 173 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/items/dto/items.dto.ts` | 190 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/items/dto/items.dto.ts` | 223 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/modules/items/dto/items.dto.ts` | 240 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `src/controllers/challenges.controller.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'UseGuards'. |
| `src/controllers/challenges.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/challenges.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/challenges.controller.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'Transform'. |
| `src/controllers/challenges.controller.ts` | - | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `src/main.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'helmet'. |
| `src/scripts/init-db.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `src/controllers/tasks.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/modules/auth/jwt.service.ts` | - | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/modules/rides/controllers/rides.controller.ts` | 412 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `Dockerfile` | - | docker:S7031 | MINOR | Merge this RUN instruction with the consecutive ones. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/stats.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/users.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/users.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/donations.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/donations.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/donations.controller.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/rides.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/controllers/rides.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/database/database.init.ts` | 10 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `src/database/database.init.ts` | 11 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `src/modules/rides/controllers/rides.controller.ts` | 312 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/modules/rides/controllers/rides.controller.ts` | 320 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `src/controllers/session.controller.ts` | - | typescript:S1128 | MINOR | Remove this unused import of 'Request'. |
| `src/modules/auth/session.service.ts` | 7 | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `src/redis/redis-cache.service.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/auth.controller.ts` | - | typescript:S3863 | MINOR | '@nestjs/common' imported multiple times. |
| `src/redis/redis.module.ts` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `src/controllers/places.controller.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/controllers/places.controller.ts` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `migrations/add-hierarchy-levels.sql` | - | plsql:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/main.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/session.controller.ts` | 8 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/main.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/main.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/main.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/main.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/main.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/modules/auth/controllers/auth.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/app.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/donations.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/stats.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/controllers/users.controller.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `src/database/database.module.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |

## Mobile – All issues (2159 issues)

| File | Line | Rule | Severity | Message |
|------|------|------|----------|--------|
| `components/LocationSearchComp.tsx` | - | secrets:S6334 | BLOCKER | Make sure this Google API Key is either secured or revoked, changed, and removed from the code. |
| `bottomBarScreens/ProfileScreen.tsx` | 177 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | 625 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed. |
| `components/EmailLoginForm.tsx` | 403 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed. |
| `context/UserContext.tsx` | 257 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `donationScreens/ItemsScreen.tsx` | 337 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `donationScreens/ItemsScreen.tsx` | 677 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `donationScreens/TrumpScreen.tsx` | 265 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed. |
| `donationScreens/TrumpScreen.tsx` | 475 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `screens/LoginScreen.tsx` | 106 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 34 to the 15 allowed. |
| `stores/userStore.ts` | 244 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 272 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `hooks/usePostMenu.ts` | 65 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `components/Feed/PostReelItem.tsx` | 163 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `components/Feed/PostCard/DonationItemCard.tsx` | 27 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 36 to the 15 allowed. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 25 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 34 to the 15 allowed. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 28 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 60 to the 15 allowed. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 26 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 30 to the 15 allowed. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 28 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 86 to the 15 allowed. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 28 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 57 to the 15 allowed. |
| `components/Feed/PostCard/TaskCompletionCard.tsx` | 26 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 36 to the 15 allowed. |
| `components/Feed/PostReelItem.tsx` | 41 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `hooks/useFeedData.ts` | 17 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 41 to the 15 allowed. |
| `screens/NewChatScreen.tsx` | 45 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed. |
| `screens/DiscoverPeopleScreen.tsx` | 108 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `screens/DiscoverPeopleScreen.tsx` | 143 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed. |
| `App.tsx` | 117 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `components/AdminHierarchyTree.tsx` | 49 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `screens/AdminPeopleScreen.tsx` | 57 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `screens/AdminTableRowsScreen.tsx` | 139 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `screens/AdminTableRowsScreen.tsx` | 373 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `screens/AdminTasksScreen.tsx` | 247 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `screens/AdminTasksScreen.tsx` | 377 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 36 to the 15 allowed. |
| `screens/AdminTasksScreen.tsx` | 578 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `screens/ChatDetailScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `scripts/audit-responsive.ts` | 234 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `scripts/audit-texts.ts` | 235 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 25 to the 15 allowed. |
| `scripts/find-unused-files.ts` | 218 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `components/CommentsModal.tsx` | 266 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 33 to the 15 allowed. |
| `context/UserContext.tsx` | 105 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `screens/LandingSiteScreen.legacy.tsx` | 660 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 33 to the 15 allowed. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 33 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | 606 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | 1292 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | 158 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | 2158 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `donationScreens/ItemsScreen.tsx` | 97 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `stores/userStore.ts` | - | typescript:S2871 | CRITICAL | Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically. |
| `stores/userStore.ts` | 568 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `topBarScreens/SettingsScreen.tsx` | 57 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `topBarScreens/SettingsScreen.tsx` | 310 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed. |
| `utils/chatService.ts` | - | typescript:S2871 | CRITICAL | Provide a compare function that depends on "String.localeCompare", to reliably sort elements alphabetically. |
| `bottomBarScreens/ProfileScreen.tsx` | 1028 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 64 to the 15 allowed. |
| `bottomBarScreens/ProfileScreen.tsx` | 1156 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 28 to the 15 allowed. |
| `components/ItemDetailsModal.tsx` | 101 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 57 to the 15 allowed. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 59 to the 15 allowed. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 59 to the 15 allowed. |
| `screens/EditProfileScreen.tsx` | 41 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed. |
| `components/ItemDetailsModal.tsx` | 348 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 23 to the 15 allowed. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 32 to the 15 allowed. |
| `components/rides/RideOfferForm.tsx` | 82 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `donationScreens/MoneyScreen.tsx` | 96 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `donationScreens/TrumpScreen.tsx` | 603 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 39 to the 15 allowed. |
| `screens/LoginScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 35 to the 15 allowed. |
| `screens/NewLoginScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 22 to the 15 allowed. |
| `donationScreens/TrumpScreen.tsx` | 783 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `screens/LandingSiteScreen.legacy.tsx` | 1487 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `screens/LoginScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `utils/chatService.ts` | 616 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `utils/enhancedDatabaseService.ts` | 783 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed. |
| `utils/loggerService.ts` | 92 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed. |
| `donationScreens/ItemsScreen.tsx` | 225 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `donationScreens/ItemsScreen.tsx` | 226 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `donationScreens/ItemsScreen.tsx` | 662 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `donationScreens/ItemsScreen.tsx` | 663 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `donationScreens/ItemsScreen.tsx` | 664 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `utils/navigationStateValidator.ts` | 61 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 20 to the 15 allowed. |
| `components/ScrollContainer.tsx` | 161 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `hooks/useScrollPosition.ts` | 114 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `hooks/useScrollPosition.ts` | 180 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `utils/chatService.ts` | 236 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 96 to the 15 allowed. |
| `utils/chatService.ts` | 545 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 18 to the 15 allowed. |
| `screens/LoginScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 241 to the 15 allowed. |
| `screens/LandingSiteScreen.legacy.tsx` | 1686 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `screens/AdminMoneyScreen.tsx` | 252 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `globals/responsive.ts` | 221 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 37 to the 15 allowed. |
| `globals/responsive.ts` | 238 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed. |
| `globals/responsive.ts` | 252 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 31 to the 15 allowed. |
| `globals/responsive.ts` | 267 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 55 to the 15 allowed. |
| `globals/responsive.ts` | 298 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed. |
| `google_auth/SecureApiService.ts` | 281 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 27 to the 15 allowed. |
| `google_auth/utils/SecureStorage.ts` | 269 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 24 to the 15 allowed. |
| `google_auth/utils/SecureStorage.ts` | 391 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 16 to the 15 allowed. |
| `google_auth/utils/SecureStorage.ts` | 655 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 21 to the 15 allowed. |
| `scripts/testAuth.js` | 25 | javascript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 26 to the 15 allowed. |
| `utils/loggerService.ts` | 49 | typescript:S7059 | CRITICAL | Refactor this asynchronous operation outside of the constructor. |
| `utils/enhancedDatabaseService.ts` | 125 | typescript:S7059 | CRITICAL | Refactor this asynchronous operation outside of the constructor. |
| `components/SearchBar.tsx` | 145 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `donationScreens/MoneyScreen.tsx` | 257 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 17 to the 15 allowed. |
| `web/index.html` | - | css:S4657 | CRITICAL | Unexpected shorthand "flex" after "flex-grow" |
| `web/index.html` | - | css:S4657 | CRITICAL | Unexpected shorthand "flex" after "flex-shrink" |
| `web/index.html` | - | css:S4657 | CRITICAL | Unexpected shorthand "flex" after "flex-basis" |
| `components/DonationStatsScreen.tsx` | 94 | typescript:S3776 | CRITICAL | Refactor this function to reduce its Cognitive Complexity from 32 to the 15 allowed. |
| `screens/BookmarksScreen.tsx` | 105 | typescript:S2004 | CRITICAL | Refactor this code to not nest functions more than 4 levels deep. |
| `bottomBarScreens/ProfileScreen.tsx` | 522 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `bottomBarScreens/ProfileScreen.tsx` | 595 | typescript:S4144 | MAJOR | Update this function so that its implementation is not identical to the one on line 147. |
| `bottomBarScreens/ProfileScreen.tsx` | 651 | typescript:S4165 | MAJOR | Review this redundant assignment: "shouldInclude" already holds the assigned value along all execution paths. |
| `bottomBarScreens/ProfileScreen.tsx` | 959 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `bottomBarScreens/ProfileScreen.tsx` | 1015 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/EmailLoginForm.tsx` | 223 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | 64 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "sliderValue". |
| `components/PostsReelsScreen.tsx` | 96 | typescript:S6544 | MAJOR | Promise-returning function provided to property where a void return was expected. |
| `components/PostsReelsScreen.tsx` | 212 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleSliderChange". |
| `components/WebModeToggleOverlay.tsx` | 45 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `donationScreens/ItemsScreen.tsx` | 162 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "filteredItems". |
| `donationScreens/ItemsScreen.tsx` | 163 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "recentMine". |
| `donationScreens/ItemsScreen.tsx` | 264 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/ItemsScreen.tsx` | 595 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "cardWidth". |
| `donationScreens/ItemsScreen.tsx` | 897 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "renderItemCard". |
| `donationScreens/ItemsScreen.tsx` | 926 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "renderRecentCard". |
| `donationScreens/TrumpScreen.tsx` | 123 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "filteredRides". |
| `donationScreens/TrumpScreen.tsx` | 124 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "recentRides". |
| `donationScreens/TrumpScreen.tsx` | 400 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/TrumpScreen.tsx` | 770 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleDeleteRide". |
| `donationScreens/TrumpScreen.tsx` | 794 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleRestoreRide". |
| `donationScreens/TrumpScreen.tsx` | 817 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleSelectRide". |
| `donationScreens/TrumpScreen.tsx` | 837 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "cardWidth". |
| `screens/AdminAdminsScreen.tsx` | 648 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isSameUser". |
| `screens/AdminAdminsScreen.tsx` | 671 | typescript:S6439 | MAJOR | Convert the conditional to a boolean to avoid leaked value |
| `screens/ChatDetailScreen.tsx` | 430 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `screens/LoginScreen.tsx` | 42 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `screens/LoginScreen.tsx` | 107 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `utils/loggerService.ts` | 272 | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 216 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 14 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 14 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 15 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 15 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 21 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 21 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 37 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 37 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 40 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 41 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 99 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 187 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 188 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 189 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 197 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 197 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 201 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 203 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 203 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 206 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 206 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 211 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 211 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 217 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 221 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 221 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 232 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 232 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 233 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 233 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 237 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 237 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 241 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 248 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 248 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 249 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 255 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 255 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 256 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 256 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 257 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 257 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 258 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 258 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 271 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 271 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 278 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 278 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 281 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 282 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/Landing/styles/index.ts` | 283 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 290 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 290 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Challenges/EditEntryModal.tsx` | 44 | typescript:S3923 | MAJOR | This conditional operation returns the same value whether the condition is "true" or "false". |
| `components/Feed/PostCard/DonationItemCard.tsx` | 59 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 57 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 60 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `donationScreens/CommunityChallengesScreen.tsx` | 84 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setSelectedFrequencyFilter". |
| `donationScreens/CommunityChallengesScreen.tsx` | 85 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setSelectedDifficultyFilter". |
| `donationScreens/CommunityChallengesScreen.tsx` | 291 | typescript:S6439 | MAJOR | Convert the conditional to a boolean to avoid leaked value |
| `screens/ChallengeDetailsScreen.tsx` | 49 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "userParticipation". |
| `screens/ChallengeDetailsScreen.tsx` | 536 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 688 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 720 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 743 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 786 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 793 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 794 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 808 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 809 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 810 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 821 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 828 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeDetailsScreen.tsx` | 834 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeStatisticsScreen.tsx` | 443 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/ChallengeStatisticsScreen.tsx` | 445 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/ChallengeStatisticsScreen.tsx` | 601 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/ChallengeStatisticsScreen.tsx` | 619 | typescript:S6590 | MAJOR | Expected a `const` instead of a literal type assertion. |
| `screens/MyChallengesScreen.tsx` | 97 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/PostCard/DonationItemCard.tsx` | 48 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/DonationItemCard.tsx` | 50 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 46 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 48 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 114 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 49 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 51 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 183 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 183 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 199 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 199 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 216 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 216 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 224 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 224 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 118 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 118 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 134 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 134 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 124 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 124 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 133 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 133 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 152 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 152 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 167 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 167 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 183 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 183 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 200 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 200 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 208 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 208 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 144 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 144 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 160 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 160 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 173 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 173 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 181 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 181 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskCompletionCard.tsx` | 104 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskCompletionCard.tsx` | 104 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskCompletionCard.tsx` | 120 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostCard/TaskCompletionCard.tsx` | 120 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/Feed/PostReelItem.tsx` | 152 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/OptionsModal.tsx` | 72 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/Feed/PostCard/DonationItemCard.tsx` | 118 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 117 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 73 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 32 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "displayTitle". |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 77 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 73 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/Feed/PostCard/TaskCompletionCard.tsx` | 67 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `hooks/usePostDeletion.ts` | 10 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "t". |
| `components/Feed/PostReelItem.tsx` | 62 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `hooks/usePostInteractions.ts` | 40 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `hooks/usePostInteractions.ts` | 76 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/NewChatScreen.tsx` | 64 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `navigations/MainNavigator.tsx` | 95 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `screens/AdminPeopleScreen.tsx` | 321 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTableRowsScreen.tsx` | 58 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedUser". |
| `screens/AdminTableRowsScreen.tsx` | 341 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTableRowsScreen.tsx` | 381 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTableRowsScreen.tsx` | 400 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTableRowsScreen.tsx` | 407 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTablesScreen.tsx` | 56 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedUser". |
| `screens/AdminTablesScreen.tsx` | 335 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `screens/AdminTablesScreen.tsx` | 370 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTasksScreen.tsx` | 272 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/AdminTasksScreen.tsx` | 596 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/AdminTimeManagementScreen.tsx` | 51 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "viewOnly". |
| `screens/LandingSiteScreen.legacy.tsx` | 1017 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isAuthenticated". |
| `screens/LandingSiteScreen.legacy.tsx` | 1017 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isGuestMode". |
| `screens/LandingSiteScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isAuthenticated". |
| `screens/LandingSiteScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isGuestMode". |
| `utils/fileService.ts` | 239 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/storageService.ts` | 44 | typescript:S3923 | MAJOR | Remove this conditional structure or edit its code blocks so that they're not all the same. |
| `utils/storageService.ts` | 51 | typescript:S1871 | MAJOR | This branch's code block is the same as the block for the branch on line 44. |
| `utils/storageService.ts` | 58 | typescript:S1871 | MAJOR | This branch's code block is the same as the block for the branch on line 44. |
| `screens/AdminTasksScreen.tsx` | 439 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTasksScreen.tsx` | 440 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTasksScreen.tsx` | 441 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTasksScreen.tsx` | 442 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `scripts/audit-structure.ts` | 36 | typescript:S2933 | MAJOR | Member 'rootDir' is never reassigned; mark it as `readonly`. |
| `scripts/audit-structure.ts` | 37 | typescript:S2933 | MAJOR | Member 'report' is never reassigned; mark it as `readonly`. |
| `scripts/audit-structure.ts` | 61 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `scripts/test-api-health.sh` | 14 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/test-api-health.sh` | 14 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/test-api-health.sh` | 15 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/test-api-health.sh` | 15 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/test-api-health.sh` | 16 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/test-api-health.sh` | 16 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/test-api-health.sh` | 17 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/test-api-health.sh` | 17 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `screens/AdminAdminsScreen.tsx` | 377 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "removeManager". |
| `screens/AdminAdminsScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonText". |
| `google_auth/SecureApiService.ts` | 202 | typescript:S2933 | MAJOR | Member '_baseUrl' is never reassigned; mark it as `readonly`. |
| `utils/restAdapter.ts` | 11 | typescript:S2933 | MAJOR | Member '_baseUrl' is never reassigned; mark it as `readonly`. |
| `scripts/audit-all.ts` | 46 | typescript:S2933 | MAJOR | Member 'rootDir' is never reassigned; mark it as `readonly`. |
| `scripts/audit-all.ts` | 47 | typescript:S2933 | MAJOR | Member 'reportsDir' is never reassigned; mark it as `readonly`. |
| `scripts/audit-all.ts` | 342 | typescript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `scripts/audit-colors.ts` | 85 | typescript:S2933 | MAJOR | Member 'report' is never reassigned; mark it as `readonly`. |
| `scripts/audit-colors.ts` | 86 | typescript:S2933 | MAJOR | Member 'rootDir' is never reassigned; mark it as `readonly`. |
| `scripts/audit-colors.ts` | 224 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "fullMatch". |
| `scripts/audit-constants.ts` | 102 | typescript:S2933 | MAJOR | Member 'report' is never reassigned; mark it as `readonly`. |
| `scripts/audit-constants.ts` | 103 | typescript:S2933 | MAJOR | Member 'rootDir' is never reassigned; mark it as `readonly`. |
| `scripts/audit-constants.ts` | 104 | typescript:S2933 | MAJOR | Member 'valueOccurrences' is never reassigned; mark it as `readonly`. |
| `scripts/audit-responsive.ts` | 94 | typescript:S2933 | MAJOR | Member 'report' is never reassigned; mark it as `readonly`. |
| `scripts/audit-responsive.ts` | 95 | typescript:S2933 | MAJOR | Member 'rootDir' is never reassigned; mark it as `readonly`. |
| `scripts/audit-responsive.ts` | 282 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "lines". |
| `scripts/audit-texts.ts` | 94 | typescript:S2933 | MAJOR | Member 'report' is never reassigned; mark it as `readonly`. |
| `scripts/audit-texts.ts` | 95 | typescript:S2933 | MAJOR | Member 'rootDir' is never reassigned; mark it as `readonly`. |
| `scripts/audit-texts.ts` | 98 | typescript:S2933 | MAJOR | Member 'usedKeys' is never reassigned; mark it as `readonly`. |
| `scripts/audit-texts.ts` | 250 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "quote". |
| `scripts/find-unused-files.ts` | 81 | typescript:S2933 | MAJOR | Member 'report' is never reassigned; mark it as `readonly`. |
| `scripts/find-unused-files.ts` | 82 | typescript:S2933 | MAJOR | Member 'rootDir' is never reassigned; mark it as `readonly`. |
| `scripts/find-unused-files.ts` | 83 | typescript:S2933 | MAJOR | Member 'allFiles' is never reassigned; mark it as `readonly`. |
| `scripts/find-unused-files.ts` | 84 | typescript:S2933 | MAJOR | Member 'importedFiles' is never reassigned; mark it as `readonly`. |
| `scripts/find-unused-files.ts` | 85 | typescript:S2933 | MAJOR | Member 'fileHashes' is never reassigned; mark it as `readonly`. |
| `scripts/find-unused-files.ts` | 86 | typescript:S2933 | MAJOR | Member 'duplicates' is never reassigned; mark it as `readonly`. |
| `stores/userStore.ts` | 560 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/postsService.ts` | 51 | typescript:S2933 | MAJOR | Member 'baseURL' is never reassigned; mark it as `readonly`. |
| `screens/AdminAdminsScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonText". |
| `screens/AdminAdminsScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonText". |
| `screens/AdminAdminsScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonText". |
| `screens/AdminTasksScreen.tsx` | 623 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminCRMScreen.tsx` | 249 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminFilesScreen.tsx` | 48 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setCurrentFolder". |
| `screens/DiscoverPeopleScreen.tsx` | 404 | typescript:S4144 | MAJOR | Update this function so that its implementation is not identical to the one on line 353. |
| `screens/LandingSiteScreen.legacy.tsx` | 1924 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1924 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1935 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1935 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1936 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1936 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1951 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1951 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1952 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1958 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1958 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1959 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1959 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1960 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1960 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1961 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1961 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1974 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1974 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 3034 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 3034 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 3038 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `App.tsx` | 398 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `App.tsx` | - | typescript:S6748 | MAJOR | Do not pass children as props. Instead, nest children between the opening and closing tags. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/VerticalGridSlider.tsx` | 18 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "stepHeight". |
| `screens/AdminAdminsScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleToggleAdmin". |
| `screens/LandingSiteScreen.legacy.tsx` | 1909 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1909 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1914 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1914 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `topBarScreens/SettingsScreen.tsx` | 355 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/ItemDetailsModal.tsx` | 197 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "currentRouteName". |
| `components/ItemDetailsModal.tsx` | 311 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/ItemsScreen.tsx` | 169 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isRefreshing". |
| `donationScreens/TrumpScreen.tsx` | 206 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `screens/ChatDetailScreen.tsx` | 525 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/ChatDetailScreen.tsx` | 602 | typescript:S3923 | MAJOR | This conditional operation returns the same value whether the condition is "true" or "false". |
| `utils/toastService.tsx` | 16 | typescript:S2933 | MAJOR | Member 'listeners' is never reassigned; mark it as `readonly`. |
| `bottomBarScreens/ProfileScreen.tsx` | 1136 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "followStats". |
| `bottomBarScreens/ProfileScreen.tsx` | 1377 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | 1379 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | 1923 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `bottomBarScreens/ProfileScreen.tsx` | 1936 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `bottomBarScreens/ProfileScreen.tsx` | 2494 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `bottomBarScreens/ProfileScreen.tsx` | 2507 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `bottomBarScreens/SearchScreen.tsx` | 45 | typescript:S7740 | MAJOR | Do not assign `this` to `context`. |
| `bottomBarScreens/SearchScreen.tsx` | 70 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedUser". |
| `bottomBarScreens/SearchScreen.tsx` | 259 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `bottomBarScreens/SearchScreen.tsx` | 438 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/SearchScreen.tsx` | 456 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/DatePicker.tsx` | 227 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/HeaderComp.tsx` | 69 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/HeaderComp.tsx` | 69 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/ItemDetailsModal.tsx` | 386 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/ItemDetailsModal.tsx` | 387 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/ItemDetailsModal.tsx` | 564 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/PostsReelsScreen.tsx` | - | typescript:S4165 | MAJOR | Review this redundant assignment: "thumbnail" already holds the assigned value along all execution paths. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 287 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/SearchBar.tsx` | 287 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/SearchBar.tsx` | 287 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `context/UserContext.tsx` | 119 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "API_BASE_URL". |
| `donationScreens/TrumpScreen.tsx` | 608 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/TrumpScreen.tsx` | 617 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `donationScreens/TrumpScreen.tsx` | 617 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/TrumpScreen.tsx` | 622 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/TrumpScreen.tsx` | 883 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleSelectRideOld". |
| `utils/databaseService.ts` | 769 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "timeStr". |
| `utils/databaseService.ts` | 818 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "timeStr". |
| `donationScreens/TrumpScreen.tsx` | 113 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "tabBarHeight". |
| `donationScreens/TrumpScreen.tsx` | 250 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "needToPay". |
| `donationScreens/TrumpScreen.tsx` | 250 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setNeedToPay". |
| `donationScreens/TrumpScreen.tsx` | 432 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/LoginSidePanel.tsx` | 39 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "t". |
| `components/LoginSidePanel.tsx` | 40 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedUser". |
| `components/LoginSidePanel.tsx` | 40 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isGuestMode". |
| `components/LoginSidePanel.tsx` | 51 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "emailExists". |
| `components/LoginSidePanel.tsx` | 52 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "emailStatusMessage". |
| `components/LoginSidePanel.tsx` | 53 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "emailSuggestions". |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/navigationQueue.ts` | - | typescript:S3923 | MAJOR | Remove this conditional structure or edit its code blocks so that they're not all the same. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "t". |
| `components/FloatingBubblesSkia.tsx` | 7 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 27 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 31 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 64 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 73 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 79 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 88 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 92 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 95 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 116 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 189 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 227 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 244 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 252 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 256 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 260 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 266 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 280 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 297 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 302 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 305 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 318 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 344 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 349 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 353 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 356 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 394 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 410 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 437 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 443 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 447 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 449 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 463 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 467 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 470 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 480 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 483 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 487 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 510 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 525 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 562 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 589 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 594 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 600 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 612 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 637 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 640 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/FloatingBubblesSkia.tsx` | 649 | typescript:S125 | MAJOR | Remove this commented out code. |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S6440 | MAJOR | React Hook "useTranslation" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S6440 | MAJOR | React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S6440 | MAJOR | React Hook "useState" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S6440 | MAJOR | React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `navigations/MainNavigator.tsx` | 86 | typescript:S6440 | MAJOR | React Hook "useMemo" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `screens/AdminMoneyScreen.tsx` | 531 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1519 | typescript:S7761 | MAJOR | Prefer `.dataset` over `getAttribute(…)`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7761 | MAJOR | Prefer `.dataset` over `getAttribute(…)`. |
| `screens/NewLoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `screens/NewLoginScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/NewLoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/AddLinkComponent.tsx` | 242 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/rides/RideOfferForm.tsx` | 147 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/rides/RideOfferForm.tsx` | 301 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/rides/RideOfferForm.tsx` | 302 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/rides/RideOfferForm.tsx` | 303 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/rides/RideOfferForm.tsx` | 304 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/HomeScreenOld.tsx` | 155 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "tabBarHeight". |
| `bottomBarScreens/HomeScreenOld.tsx` | 158 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setSelectedUser". |
| `bottomBarScreens/HomeScreenOld.tsx` | 158 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isRealAuth". |
| `bottomBarScreens/HomeScreenOld.tsx` | 160 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "refreshKey". |
| `bottomBarScreens/HomeScreenOld.tsx` | 161 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedStat". |
| `bottomBarScreens/HomeScreenOld.tsx` | 162 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isStatModalVisible". |
| `bottomBarScreens/HomeScreenOld.tsx` | 284 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleSelectStat". |
| `bottomBarScreens/HomeScreenOld.tsx` | 292 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleScroll". |
| `bottomBarScreens/HomeScreenOld.tsx` | 293 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "contentSize". |
| `bottomBarScreens/HomeScreenOld.tsx` | 293 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "layoutMeasurement". |
| `bottomBarScreens/HomeScreenOld.tsx` | 300 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "postsAnimatedStyle". |
| `bottomBarScreens/HomeScreenOld.tsx` | 355 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "stats". |
| `bottomBarScreens/HomeScreenOld.tsx` | 394 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/PostsReelsScreen.tsx` | - | typescript:S3923 | MAJOR | Remove this conditional structure or edit its code blocks so that they're not all the same. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1871 | MAJOR | This branch's code block is the same as the block for the branch on line 970. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "apiService". |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/AdminPeopleScreen.tsx` | 62 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isAdmin". |
| `screens/AdminPeopleScreen.tsx` | - | typescript:S1534 | MAJOR | No duplicate props allowed |
| `scripts/clear-local-storage.sh` | 19 | shelldre:S7688 | MAJOR | Use '[[' instead of '[' for conditional tests. The '[[' construct is safer and more feature-rich. |
| `scripts/run-local-e2e.sh` | 18 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/run-local-e2e.sh` | 19 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/run-local-e2e.sh` | 22 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/run-local-e2e.sh` | 23 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/run-local-e2e.sh` | 26 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/run-local-e2e.sh` | 27 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/run-local-e2e.sh` | 30 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/run-local-e2e.sh` | 31 | shelldre:S7679 | MAJOR | Assign this positional parameter to a local variable. |
| `scripts/run-local-e2e.sh` | 35 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `scripts/run-local-e2e.sh` | 73 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `utils/apiService.ts` | 836 | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `utils/enhancedDatabaseService.ts` | 362 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `utils/enhancedDatabaseService.ts` | 791 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/enhancedDatabaseService.ts` | 791 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/enhancedDatabaseService.ts` | 795 | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `utils/navigationPersistence.ts` | 119 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/ItemsScreen.tsx` | 236 | typescript:S6671 | MAJOR | Expected the Promise rejection reason to be an Error. |
| `donationScreens/ItemsScreen.tsx` | 259 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "dummyItems". |
| `donationScreens/ItemsScreen.tsx` | 955 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `donationScreens/ItemsScreen.tsx` | 956 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `App.tsx` | - | typescript:S3923 | MAJOR | Remove this conditional structure or edit its code blocks so that they're not all the same. |
| `App.tsx` | - | typescript:S1871 | MAJOR | This branch's code block is the same as the block for the branch on line 241. |
| `components/FirebaseGoogleButton.tsx` | 24 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isAuthenticated". |
| `components/FirebaseGoogleButton.tsx` | 24 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isGuestMode". |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S6440 | MAJOR | React Hook "useUser" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `components/WebModeToggleOverlay.tsx` | 64 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleToggle". |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isAuthenticated". |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isGuestMode". |
| `utils/navigationQueue.ts` | 23 | typescript:S2933 | MAJOR | Member 'defaultPriority' is never reassigned; mark it as `readonly`. |
| `utils/navigationQueue.ts` | - | typescript:S3923 | MAJOR | Remove this conditional structure or edit its code blocks so that they're not all the same. |
| `hooks/useScrollPosition.ts` | 17 | typescript:S7760 | MAJOR | Prefer default parameters over reassignment. |
| `hooks/useScrollPosition.ts` | 138 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "scrollView". |
| `screens/ChatDetailScreen.tsx` | - | typescript:S3923 | MAJOR | Remove this conditional structure or edit its code blocks so that they're not all the same. |
| `utils/chatService.ts` | 252 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `utils/chatService.ts` | 286 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `utils/chatService.ts` | 289 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `bottomBarScreens/DonationsScreen.tsx` | 129 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isMobileWebView". |
| `bottomBarScreens/DonationsScreen.tsx` | 204 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "cardPadding". |
| `bottomBarScreens/DonationsScreen.tsx` | 225 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/DonationsScreen.tsx` | 227 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/DonationsScreen.tsx` | 230 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3923 | MAJOR | This conditional operation returns the same value whether the condition is "true" or "false". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3923 | MAJOR | This conditional operation returns the same value whether the condition is "true" or "false". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3923 | MAJOR | This conditional operation returns the same value whether the condition is "true" or "false". |
| `screens/LandingSiteScreen.legacy.tsx` | 1112 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `screens/LandingSiteScreen.legacy.tsx` | 1371 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `screens/LandingSiteScreen.legacy.tsx` | 3218 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `screens/LandingSiteScreen.tsx` | - | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/profileUtils.ts` | 36 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `app/oauthredirect.tsx` | 42 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/FirebaseGoogleButton.tsx` | 25 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `public/oauth-callback.html` | - | Web:S5254 | MAJOR | Add "lang" and/or "xml:lang" attributes to this "<html>" element |
| `public/oauth-callback.html` | 16 | css:S7924 | MAJOR | Text does not meet the minimal contrast requirement with its background. |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S6440 | MAJOR | React Hook "useWebMode" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `components/WebModeToggleOverlay.tsx` | - | typescript:S6440 | MAJOR | React Hook "useNavigation" is called conditionally. React Hooks must be called in the exact same order in every component render. |
| `navigations/TopBarNavigator.tsx` | 114 | typescript:S125 | MAJOR | Remove this commented out code. |
| `topBarScreens/SettingsScreen.tsx` | 671 | typescript:S125 | MAJOR | Remove this commented out code. |
| `utils/RTLConfig.ts` | 22 | typescript:S125 | MAJOR | Remove this commented out code. |
| `stores/userStore.ts` | 261 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `stores/userStore.ts` | 307 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `Dockerfile` | 4 | docker:S6476 | MAJOR | Replace "as" with upper case format "AS". |
| `Dockerfile` | 35 | docker:S6476 | MAJOR | Replace "as" with upper case format "AS". |
| `screens/LandingSiteScreen.legacy.tsx` | 2006 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2006 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2010 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 576 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 3086 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1890 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1891 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1892 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1900 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1900 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1904 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1906 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1906 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1920 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1940 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1940 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1944 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1981 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1981 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1984 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1985 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1986 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2045 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2069 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2074 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2074 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2075 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2075 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2081 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2081 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2089 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2089 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2092 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2093 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2097 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2101 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2102 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2149 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2151 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2154 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2467 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 2690 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LandingSiteScreen.legacy.tsx` | 1573 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `screens/LandingSiteScreen.legacy.tsx` | 1766 | typescript:S7761 | MAJOR | Prefer `.dataset` over `getAttribute(…)`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7761 | MAJOR | Prefer `.dataset` over `getAttribute(…)`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7727 | MAJOR | Do not pass function `observeSection` directly to `.forEach(…)`. |
| `screens/AdminMoneyScreen.tsx` | 264 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/AdminMoneyScreen.tsx` | 694 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminMoneyScreen.tsx` | 694 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/AdminTasksScreen.tsx` | 68 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "loading". |
| `screens/AdminTasksScreen.tsx` | 70 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "creating". |
| `screens/AdminTasksScreen.tsx` | 97 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setFilterCategory". |
| `screens/AdminTasksScreen.tsx` | 431 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/apiService.ts` | 85 | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `context/UserContext.tsx` | 594 | typescript:S6481 | MAJOR | The 'value' object passed as the value prop to the Context provider changes every render. To fix this consider wrapping it in a useMemo hook. |
| `components/HeaderComp.tsx` | 64 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `components/SearchBar.tsx` | 283 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `globals/responsive.ts` | 207 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isLargeDesktop". |
| `globals/responsive.ts` | 222 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `globals/responsive.ts` | 227 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 227 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 228 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 228 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 229 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 229 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 230 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 230 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 231 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 231 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 232 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 232 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 239 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `globals/responsive.ts` | 244 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 244 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 245 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 245 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 246 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 246 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 253 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `globals/responsive.ts` | 258 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 258 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 259 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 259 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 260 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 260 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 261 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 261 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 262 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 262 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 268 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `globals/responsive.ts` | 273 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 273 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 274 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 274 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 275 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 275 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 276 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 276 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 277 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 277 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 278 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 278 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 279 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 279 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 280 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 280 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 281 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 281 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `globals/responsive.ts` | 316 | typescript:S1871 | MAJOR | This branch's code block is the same as the block for the branch on line 312. |
| `screens/AdminMoneyScreen.tsx` | 111 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "pollingId". |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonMinWidth". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "expandedRowMaxWidth". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isDesktop". |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isMobileWeb". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonMinWidth". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonMaxWidth". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonMarginBottom". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "buttonMarginVertical". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "expandedRowMaxWidth". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "suggestionsBoxMaxWidth". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "statusRowMaxWidth". |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/LoginScreen.tsx` | - | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/followService.ts` | - | typescript:S4822 | MAJOR | Consider using 'await' for the promise inside this 'try' or replace it with 'Promise.prototype.catch(...)' usage. |
| `google_auth/AuthConfiguration.ts` | 422 | typescript:S6836 | MAJOR | Unexpected lexical declaration in case block. |
| `google_auth/AuthConfiguration.ts` | 688 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `google_auth/GoogleAuthService.ts` | 238 | typescript:S2933 | MAJOR | Member 'listeners' is never reassigned; mark it as `readonly`. |
| `google_auth/SecureApiService.ts` | 137 | typescript:S2933 | MAJOR | Member 'cache' is never reassigned; mark it as `readonly`. |
| `google_auth/SecureApiService.ts` | 208 | typescript:S2933 | MAJOR | Member 'cache' is never reassigned; mark it as `readonly`. |
| `google_auth/SecureApiService.ts` | 833 | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `google_auth/SecureApiService.ts` | 898 | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `google_auth/SecureApiService.ts` | 945 | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `google_auth/index.ts` | 240 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "googleAuthService". |
| `google_auth/index.ts` | 263 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `google_auth/types/AuthTypes.ts` | 36 | typescript:S6564 | MAJOR | Remove this redundant type alias and replace its occurrences with "string". |
| `google_auth/types/AuthTypes.ts` | 42 | typescript:S6564 | MAJOR | Remove this redundant type alias and replace its occurrences with "string". |
| `google_auth/utils/ErrorHandler.ts` | 532 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `context/UserContext.tsx` | 589 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `navigations/AdminStack.tsx` | 49 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `context/UserContext.tsx` | 274 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `context/UserContext.tsx` | 307 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `utils/authTestUtils.ts` | 334 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "response". |
| `scripts/testAuth.js` | 207 | javascript:S7785 | MAJOR | Prefer top-level await over using a promise chain. |
| `utils/authTestUtils.ts` | 202 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `utils/authTestUtils.ts` | 376 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "invalidJWT". |
| `utils/authTestUtils.ts` | 451 | typescript:S5869 | MAJOR | Remove duplicates in this character class. |
| `utils/authTestUtils.ts` | 483 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/ErrorBoundary.tsx` | 64 | typescript:S2933 | MAJOR | Member 'handleRestart' is never reassigned; mark it as `readonly`. |
| `components/ErrorBoundary.tsx` | 75 | typescript:S2933 | MAJOR | Member 'handleShowDetails' is never reassigned; mark it as `readonly`. |
| `context/AppLoadingContext.tsx` | 220 | typescript:S6481 | MAJOR | The 'contextValue' object passed as the value prop to the Context provider changes every render. To fix this consider wrapping it in a useMemo hook. |
| `utils/enhancedDatabaseService.ts` | 717 | typescript:S6836 | MAJOR | Unexpected lexical declaration in case block. |
| `globals/responsive.ts` | 114 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "height". |
| `components/FloatingBubblesOverlay.tsx` | 74 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "dimensions". |
| `utils/loggerService.ts` | - | typescript:S4624 | MAJOR | Refactor this code to not use nested template literals. |
| `utils/loggerService.ts` | 300 | typescript:S7762 | MAJOR | Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`. |
| `utils/enhancedDatabaseService.ts` | 203 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `utils/enhancedDatabaseService.ts` | 709 | typescript:S6836 | MAJOR | Unexpected lexical declaration in case block. |
| `utils/enhancedDatabaseService.ts` | 713 | typescript:S6836 | MAJOR | Unexpected lexical declaration in case block. |
| `utils/statsService.ts` | 292 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/statsService.ts` | 293 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | 1039 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setSelectedUserWithMode". |
| `components/CommunityStatsGrid.tsx` | 51 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "loading". |
| `components/PostsReelsScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isLoadingReal". |
| `donationScreens/KnowledgeScreen.tsx` | 137 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedUser". |
| `donationScreens/MoneyScreen.tsx` | 229 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `donationScreens/MoneyScreen.tsx` | 229 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `donationScreens/MoneyScreen.tsx` | 232 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/TimeScreen.tsx` | 113 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedUser". |
| `topBarScreens/ChatListScreen.tsx` | 28 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "isRealAuth". |
| `utils/statsService.ts` | 135 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `utils/statsService.ts` | 135 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/ProfileCompletionBanner.tsx` | 21 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/ProfileCompletionBanner.tsx` | 29 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "i18n". |
| `screens/LoginScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "emailExists". |
| `screens/LoginScreen.tsx` | - | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `scripts/run-local-e2e.sh` | 41 | shelldre:S7682 | MAJOR | Add an explicit return statement at the end of the function. |
| `donationScreens/MoneyScreen.tsx` | 200 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/AdminOrgApprovalsScreen.tsx` | 91 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/OrgDashboardScreen.tsx` | 10 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "t". |
| `topBarScreens/SettingsScreen.tsx` | 699 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `topBarScreens/SettingsScreen.tsx` | 709 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `screens/DiscoverPeopleScreen.tsx` | 113 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `screens/DiscoverPeopleScreen.tsx` | 113 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `navigations/BottomNavigator.tsx` | 251 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `navigations/BottomNavigator.tsx` | 252 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `navigations/BottomNavigator.tsx` | 252 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `bottomBarScreens/ProfileScreen.tsx` | - | typescript:S1854 | MAJOR | Remove this useless assignment to variable "t". |
| `components/SearchBar.tsx` | 193 | typescript:S1871 | MAJOR | This branch's code block is the same as the block for the branch on line 187. |
| `components/StatDetailsModal.tsx` | 38 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/StatDetailsModal.tsx` | 66 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/StatMiniCharts.tsx` | 23 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/StatMiniCharts.tsx` | 40 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `donationScreens/MoneyScreen.tsx` | 227 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "preferredCharity". |
| `donationScreens/MoneyScreen.tsx` | 515 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "openBitDonation". |
| `donationScreens/ItemsScreen.tsx` | 252 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `topBarScreens/ChatListScreen.tsx` | 176 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "combinedUsers". |
| `utils/databaseService.ts` | 54 | typescript:S2933 | MAJOR | Member 'DB_VERSION' is never reassigned; mark it as `readonly`. |
| `utils/databaseService.ts` | 55 | typescript:S2933 | MAJOR | Member 'VERSION_KEY' is never reassigned; mark it as `readonly`. |
| `navigations/DonationsStack.tsx` | 80 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `navigations/HomeTabStack.tsx` | 110 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `navigations/ProfileTabStack.tsx` | 58 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `navigations/SearchTabStack.tsx` | 57 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `navigations/BottomNavigator.tsx` | 156 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `navigations/BottomNavigator.tsx` | 255 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `screens/NewChatScreen.tsx` | 48 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "route". |
| `screens/NotificationsScreen.tsx` | 51 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "showSettings". |
| `screens/NotificationsScreen.tsx` | 51 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "setShowSettings". |
| `screens/NotificationsScreen.tsx` | 121 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleMarkAsRead". |
| `utils/followService.ts` | - | typescript:S1763 | MAJOR | Unreachable code. |
| `donationScreens/KnowledgeScreen.tsx` | 164 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedMentorship". |
| `donationScreens/KnowledgeScreen.tsx` | 165 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "refreshKey". |
| `donationScreens/MoneyScreen.tsx` | 150 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "refreshKey". |
| `donationScreens/TimeScreen.tsx` | 127 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedTask". |
| `donationScreens/TimeScreen.tsx` | 128 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "refreshKey". |
| `screens/BookmarksScreen.tsx` | 43 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `screens/BookmarksScreen.tsx` | 47 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "refreshKey". |
| `screens/FollowersScreen.tsx` | 47 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "refreshKey". |
| `topBarScreens/SettingsScreen.tsx` | 65 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "refreshKey". |
| `screens/DiscoverPeopleScreen.tsx` | 512 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/SearchBar.tsx` | 109 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 112 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 115 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 118 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 121 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 124 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 140 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `components/SearchBar.tsx` | 148 | typescript:S6582 | MAJOR | Prefer using an optional chain expression instead, as it's more concise and easier to read. |
| `donationScreens/KnowledgeScreen.tsx` | 159 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "searchQuery". |
| `donationScreens/KnowledgeScreen.tsx` | 160 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedFilter". |
| `donationScreens/KnowledgeScreen.tsx` | 161 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedSort". |
| `donationScreens/MoneyScreen.tsx` | 39 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `donationScreens/MoneyScreen.tsx` | 40 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `donationScreens/MoneyScreen.tsx` | 41 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `donationScreens/TimeScreen.tsx` | 123 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "searchQuery". |
| `donationScreens/TimeScreen.tsx` | 124 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedFilter". |
| `donationScreens/TimeScreen.tsx` | 125 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "selectedSort". |
| `globals/constants.tsx` | 275 | typescript:S6397 | MAJOR | Replace this character class by the character itself. |
| `globals/constants.tsx` | 275 | typescript:S6535 | MAJOR | Unnecessary escape character: \+. |
| `globals/constants.tsx` | 275 | typescript:S6397 | MAJOR | Replace this character class by the character itself. |
| `components/DonationStatsScreen.tsx` | 394 | typescript:S3358 | MAJOR | Extract this nested ternary operation into an independent statement. |
| `components/GuestModeNotice.tsx` | 22 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "navigation". |
| `topBarScreens/SettingsScreen.tsx` | 433 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `topBarScreens/SettingsScreen.tsx` | 670 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "offsetY". |
| `screens/ChatDetailScreen.tsx` | 183 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "generateFakeResponse". |
| `bottomBarScreens/ProfileScreen.tsx` | 2726 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/CommunityStatsPanel.tsx` | - | typescript:S6440 | MAJOR | React Hook "useSharedValue" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? |
| `components/CommunityStatsPanel.tsx` | - | typescript:S6440 | MAJOR | React Hook "useSharedValue" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? |
| `components/CommunityStatsPanel.tsx` | 62 | typescript:S6660 | MAJOR | 'If' statement should not be the only statement in 'else' block |
| `components/CommunityStatsPanel.tsx` | 72 | typescript:S6440 | MAJOR | React Hook "useAnimatedStyle" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? |
| `components/CommunityStatsPanel.tsx` | 78 | typescript:S6440 | MAJOR | React Hook "useAnimatedStyle" is called conditionally. React Hooks must be called in the exact same order in every component render. Did you accidentally call a React Hook after an early return? |
| `components/CommunityStatsPanel.tsx` | 143 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/TaskItem.tsx` | 165 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `donationScreens/MoneyScreen.tsx` | 396 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "showCharityDetailsModal". |
| `donationScreens/MoneyScreen.tsx` | 623 | typescript:S6478 | MAJOR | Move this component definition out of the parent component and pass data as props. |
| `topBarScreens/SettingsScreen.tsx` | 130 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleBackPress". |
| `components/SearchBar.tsx` | 70 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "getPaddingBottom". |
| `donationScreens/MoneyScreen.tsx` | 503 | typescript:S1854 | MAJOR | Remove this useless assignment to variable "handleDonate". |
| `components/MenuComp.tsx` | 113 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/SearchBar.tsx` | 365 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `components/SearchBar.tsx` | 428 | typescript:S6479 | MAJOR | Do not use Array index in keys |
| `bottomBarScreens/ProfileScreen.tsx` | 47 | typescript:S1128 | MINOR | Remove this unused import of 'FeedItem'. |
| `bottomBarScreens/ProfileScreen.tsx` | 47 | typescript:S1128 | MINOR | Remove this unused import of 'FeedUser'. |
| `bottomBarScreens/ProfileScreen.tsx` | 81 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/EmailLoginForm.tsx` | 13 | typescript:S1128 | MINOR | Remove this unused import of 'useRef'. |
| `components/EmailLoginForm.tsx` | 21 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `components/EmailLoginForm.tsx` | 24 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `components/EmailLoginForm.tsx` | 36 | typescript:S1128 | MINOR | Remove this unused import of 'restAdapter'. |
| `components/EmailLoginForm.tsx` | 390 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/EmailLoginForm.tsx` | 463 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/EmailLoginForm.tsx` | 487 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/LoginSidePanel.tsx` | 14 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `components/PostsReelsScreen.tsx` | 13 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `components/PostsReelsScreen.tsx` | 14 | typescript:S1128 | MINOR | Remove this unused import of 'ActionSheetIOS'. |
| `components/PostsReelsScreen.tsx` | 25 | typescript:S1128 | MINOR | Remove this unused import of 'Option'. |
| `components/PostsReelsScreen.tsx` | 32 | typescript:S1128 | MINOR | Remove this unused import of 'usePostDeletion'. |
| `components/PostsReelsScreen.tsx` | 221 | typescript:S6767 | MINOR | 'item' PropType is defined but prop is never used |
| `context/UserContext.tsx` | 312 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `context/UserContext.tsx` | 318 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `donationScreens/ItemsScreen.tsx` | 317 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `donationScreens/ItemsScreen.tsx` | 318 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `donationScreens/ItemsScreen.tsx` | 320 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `donationScreens/ItemsScreen.tsx` | 767 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `donationScreens/ItemsScreen.tsx` | 854 | typescript:S6767 | MINOR | 'item' PropType is defined but prop is never used |
| `donationScreens/TrumpScreen.tsx` | 31 | typescript:S1128 | MINOR | Remove this unused import of 'RideCard'. |
| `donationScreens/TrumpScreen.tsx` | 32 | typescript:S1128 | MINOR | Remove this unused import of 'RideHistoryCard'. |
| `donationScreens/TrumpScreen.tsx` | 271 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `donationScreens/TrumpScreen.tsx` | 343 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `donationScreens/TrumpScreen.tsx` | 344 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `donationScreens/TrumpScreen.tsx` | 346 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `donationScreens/TrumpScreen.tsx` | 847 | typescript:S6767 | MINOR | 'item' PropType is defined but prop is never used |
| `screens/LoginScreen.tsx` | 51 | typescript:S6754 | MINOR | useState call is not destructured into value + setter pair |
| `stores/userStore.ts` | 312 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `stores/userStore.ts` | 318 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `utils/apiService.ts` | 163 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `utils/restAdapter.ts` | 72 | typescript:S7744 | MINOR | The empty object is useless. |
| `components/Challenges/EditEntryModal.tsx` | 85 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/Challenges/HabitsStatsCard.tsx` | 21 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/Landing/utils/index.ts` | 36 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 66 | typescript:S7755 | MINOR | Prefer `.at(…)` over `[….length - index]`. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 176 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 177 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `components/Challenges/DailyHabitsQuickView.tsx` | 233 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `components/Challenges/EditChallengeModal.tsx` | 40 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/Challenges/EditChallengeModal.tsx` | 114 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `components/Challenges/EditEntryModal.tsx` | 14 | typescript:S1128 | MINOR | Remove this unused import of 'ChallengeType'. |
| `components/Challenges/EditEntryModal.tsx` | 135 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `components/Challenges/EditEntryModal.tsx` | 136 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/Challenges/EditEntryModal.tsx` | 165 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `components/Challenges/EditEntryModal.tsx` | 179 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `components/Challenges/HabitsTrackerCell.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'View'. |
| `donationScreens/CommunityChallengesScreen.tsx` | 18 | typescript:S1128 | MINOR | Remove this unused import of 'ParamListBase'. |
| `donationScreens/CommunityChallengesScreen.tsx` | 64 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `donationScreens/CommunityChallengesScreen.tsx` | 70 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/CommunityChallengesScreen.tsx` | 239 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/ChallengeDetailsScreen.tsx` | 3 | typescript:S1128 | MINOR | Remove this unused import of 'useEffect'. |
| `screens/ChallengeDetailsScreen.tsx` | 15 | typescript:S1128 | MINOR | Remove this unused import of 'Image'. |
| `screens/ChallengeDetailsScreen.tsx` | 39 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/ChallengeDetailsScreen.tsx` | 162 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/ChallengeDetailsScreen.tsx` | 163 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/ChallengeStatisticsScreen.tsx` | 11 | typescript:S1128 | MINOR | Remove this unused import of 'TouchableOpacity'. |
| `screens/ChallengeStatisticsScreen.tsx` | 17 | typescript:S1128 | MINOR | Remove this unused import of 'LineChart'. |
| `screens/ChallengeStatisticsScreen.tsx` | 67 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/ChallengeStatisticsScreen.tsx` | 379 | typescript:S7745 | MINOR | The non-empty check is useless as `Array#some()` returns `false` for an empty array. |
| `screens/ChallengeStatisticsScreen.tsx` | 404 | typescript:S7745 | MINOR | The non-empty check is useless as `Array#some()` returns `false` for an empty array. |
| `screens/MyChallengesScreen.tsx` | 12 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `screens/MyChallengesScreen.tsx` | 50 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/MyCreatedChallengesScreen.tsx` | 46 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/Feed/PostCard/DonationItemCard.tsx` | 43 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/DonationItemCard.tsx` | 43 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/DonationItemCard.tsx` | 43 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 41 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 41 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/ItemDeliveredCard.tsx` | 41 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 44 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 44 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/RegularItemCard.tsx` | 44 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `components/Feed/PostCard/RideCompletedCard.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `components/Feed/PostCard/RideOfferedCard.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `components/Feed/PostCard/TaskAssignmentCard.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `components/Feed/PostCard/TaskCompletionCard.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `hooks/useFeedData.ts` | 100 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `hooks/usePostMenu.ts` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `components/Feed/PostReelItem.tsx` | 270 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/Feed/PostReelItem.tsx` | 277 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `hooks/useFeedData.ts` | 24 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `hooks/usePostDeletion.ts` | 57 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useFeedData.ts` | 153 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/Feed/FeedHeader.tsx` | 7 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `components/Feed/PostReelItem.tsx` | 3 | typescript:S1128 | MINOR | Remove this unused import of 'View'. |
| `hooks/useFeedData.ts` | 3 | typescript:S1128 | MINOR | Remove this unused import of 'databaseService'. |
| `hooks/useFeedData.ts` | 150 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `hooks/useFeedData.ts` | 151 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `hooks/usePostInteractions.ts` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `hooks/usePostInteractions.ts` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `hooks/useProfileNavigation.ts` | 43 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `hooks/useProfileNavigation.ts` | 120 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `types/feed.ts` | 2 | typescript:S6571 | MINOR | "task_assignment" is overridden by string in this union type. |
| `types/feed.ts` | 2 | typescript:S6571 | MINOR | "task_completion" is overridden by string in this union type. |
| `navigations/HomeTabStack.tsx` | 11 | typescript:S1128 | MINOR | Remove this unused import of 'useFocusEffect'. |
| `components/ScreenWrapper.tsx` | 38 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.legacy.tsx` | 3 | typescript:S1128 | MINOR | Remove this unused import of 'Suspense'. |
| `screens/LandingSiteScreen.legacy.tsx` | 3 | typescript:S1128 | MINOR | Remove this unused import of 'lazy'. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'Suspense'. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'lazy'. |
| `components/TaskHoursModal.tsx` | 25 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/TaskHoursModal.tsx` | 38 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `components/TaskHoursModal.tsx` | 40 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `navigations/MainNavigator.tsx` | 94 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `navigations/MainNavigator.tsx` | 97 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/MainNavigator.tsx` | 98 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/AdminFilesScreen.tsx` | 125 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `screens/AdminFilesScreen.tsx` | 244 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/AdminTableRowsScreen.tsx` | 12 | typescript:S1128 | MINOR | Remove this unused import of 'RefreshControl'. |
| `screens/AdminTableRowsScreen.tsx` | 56 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminTablesScreen.tsx` | 54 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminTasksScreen.tsx` | 273 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 274 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/AdminTasksScreen.tsx` | 496 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 497 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 499 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 502 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 505 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 508 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 597 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `screens/AdminTasksScreen.tsx` | 598 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/AdminTimeManagementScreen.tsx` | 48 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminTimeManagementScreen.tsx` | 106 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/ChatDetailScreen.tsx` | 295 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `screens/CommunityStatsScreen.tsx` | 7 | typescript:S1128 | MINOR | Remove this unused import of 'LAYOUT_CONSTANTS'. |
| `screens/CommunityStatsScreen.tsx` | 144 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/LandingSiteScreen.legacy.tsx` | 4 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `utils/storageService.ts` | 12 | typescript:S6598 | MINOR | Interface has only a call signature, you should use a function type instead. |
| `utils/storageService.ts` | 111 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 114 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 118 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 121 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 124 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 157 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 158 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 159 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 160 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 163 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 166 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 174 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/storageService.ts` | 174 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `scripts/audit-all.ts` | 242 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 243 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 244 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 280 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 281 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-structure.ts` | 17 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/audit-structure.ts` | 18 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/test-api-health.sh` | 94 | shelldre:S1192 | MINOR | Define a constant instead of using the literal '\n%{http_code}' 5 times. |
| `screens/AdminAdminsScreen.tsx` | 388 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/AdminAdminsScreen.tsx` | 388 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `google_auth/SecureApiService.ts` | 241 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `google_auth/SecureApiService.ts` | 241 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `google_auth/SecureApiService.ts` | 242 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/apiService.ts` | 40 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/apiService.ts` | 40 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/apiService.ts` | 41 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/config.constants.ts` | 7 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/config.constants.ts` | 7 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/config.constants.ts` | 8 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/config.constants.ts` | 51 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/config.constants.ts` | 51 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/config.constants.ts` | 52 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/config.constants.ts` | 87 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read. |
| `utils/restAdapter.ts` | 29 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/restAdapter.ts` | 29 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/restAdapter.ts` | 30 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `components/DevEnvironmentBanner.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Linking'. |
| `scripts/audit-all.ts` | 17 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/audit-all.ts` | 18 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/audit-all.ts` | 171 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 172 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 175 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 176 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 177 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 178 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 181 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 182 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 183 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 186 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 187 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 188 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 191 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 192 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 193 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 194 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 195 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 196 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 197 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 198 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 201 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 202 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 203 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 204 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 205 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 206 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 207 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 208 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 209 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 212 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 213 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 214 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 215 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 216 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 217 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 218 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 219 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 222 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 223 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 224 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 225 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 226 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 227 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 228 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 229 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 230 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 233 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 234 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 235 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 236 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 239 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 247 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 248 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 251 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 257 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 258 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 259 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 261 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 262 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 263 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 264 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 267 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 268 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 269 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 270 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 271 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 272 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 275 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 276 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 277 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 278 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-all.ts` | 279 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `scripts/audit-colors.ts` | 18 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/audit-colors.ts` | 19 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/audit-colors.ts` | 56 | typescript:S7776 | MINOR | `NAMED_COLORS` should be a `Set`, and use `NAMED_COLORS.has()` to check existence or non-existence. |
| `scripts/audit-colors.ts` | 78 | typescript:S7776 | MINOR | `SAFE_COLORS` should be a `Set`, and use `SAFE_COLORS.has()` to check existence or non-existence. |
| `scripts/audit-constants.ts` | 17 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/audit-constants.ts` | 18 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/audit-constants.ts` | 99 | typescript:S7776 | MINOR | `SAFE_NUMBERS` should be a `Set`, and use `SAFE_NUMBERS.has()` to check existence or non-existence. |
| `scripts/audit-constants.ts` | 196 | typescript:S7780 | MINOR | `String.raw` should be used to avoid escaping `\`. |
| `scripts/audit-constants.ts` | 200 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `scripts/audit-constants.ts` | 268 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `scripts/audit-responsive.ts` | 18 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/audit-responsive.ts` | 19 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/audit-texts.ts` | 18 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/audit-texts.ts` | 19 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/audit-texts.ts` | 218 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `scripts/audit-texts.ts` | 228 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `scripts/audit-texts.ts` | 229 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `scripts/find-unused-files.ts` | 16 | typescript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/find-unused-files.ts` | 17 | typescript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/find-unused-files.ts` | 18 | typescript:S7772 | MINOR | Prefer `node:crypto` over `crypto`. |
| `scripts/find-unused-files.ts` | 54 | typescript:S7776 | MINOR | `ENTRY_POINTS` should be a `Set`, and use `ENTRY_POINTS.has()` to check existence or non-existence. |
| `scripts/find-unused-files.ts` | 157 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `scripts/find-unused-files.ts` | 158 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `scripts/find-unused-files.ts` | 159 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `scripts/find-unused-files.ts` | 163 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `scripts/find-unused-files.ts` | 219 | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `utils/versionChecker.ts` | 176 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/versionChecker.ts` | 81 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `utils/versionChecker.ts` | 137 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/versionChecker.ts` | 155 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/versionChecker.ts` | 209 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/versionChecker.ts` | 222 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/versionChecker.ts` | 233 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `components/CommentsModal.tsx` | 50 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/CommentsModal.tsx` | 292 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `utils/apiService.ts` | - | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `utils/postsService.ts` | 65 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6571 | MINOR | "task_assignment" is overridden by string in this union type. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6571 | MINOR | "task_completion" is overridden by string in this union type. |
| `bottomBarScreens/ProfileScreen.tsx` | 2108 | typescript:S4325 | MINOR | This assertion is unnecessary since the receiver accepts the original type of the expression. |
| `bottomBarScreens/ProfileScreen.tsx` | 2154 | typescript:S4325 | MINOR | This assertion is unnecessary since the receiver accepts the original type of the expression. |
| `components/UserSelector.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `components/UserSelector.tsx` | 23 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminCRMScreen.tsx` | 57 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminCRMScreen.tsx` | 96 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/AdminCRMScreen.tsx` | 158 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/AdminCRMScreen.tsx` | 194 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/AdminFilesScreen.tsx` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'TextInput'. |
| `screens/AdminFilesScreen.tsx` | 19 | typescript:S1128 | MINOR | Remove this unused import of 'FontSizes'. |
| `screens/AdminFilesScreen.tsx` | 19 | typescript:S1128 | MINOR | Remove this unused import of 'LAYOUT_CONSTANTS'. |
| `screens/AdminFilesScreen.tsx` | 41 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminFilesScreen.tsx` | 68 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `utils/apiService.ts` | 893 | typescript:S6551 | MINOR | 'v' will use Object's default stringification format ('[object Object]') when stringified. |
| `utils/apiService.ts` | 894 | typescript:S6551 | MINOR | 'v' will use Object's default stringification format ('[object Object]') when stringified. |
| `utils/apiService.ts` | 911 | typescript:S6551 | MINOR | 'v' will use Object's default stringification format ('[object Object]') when stringified. |
| `utils/apiService.ts` | 912 | typescript:S6551 | MINOR | 'v' will use Object's default stringification format ('[object Object]') when stringified. |
| `screens/DiscoverPeopleScreen.tsx` | 177 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/DiscoverPeopleScreen.tsx` | 203 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/VerticalGridSlider.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'TouchableOpacity'. |
| `components/VerticalGridSlider.tsx` | 11 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `navigations/BottomNavigator.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/BottomNavigator.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/BottomNavigator.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/AdminAdminsScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'logger'. |
| `screens/AdminAdminsScreen.tsx` | 32 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminDashboardScreen.tsx` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `topBarScreens/SettingsScreen.tsx` | 53 | typescript:S1128 | MINOR | Remove this unused import of 'createConversation'. |
| `topBarScreens/SettingsScreen.tsx` | 53 | typescript:S1128 | MINOR | Remove this unused import of 'sendMessage'. |
| `utils/chatService.ts` | 167 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/DiscoverPeopleScreen.tsx` | 232 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `donationScreens/ItemsScreen.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'ScrollView'. |
| `bottomBarScreens/ProfileScreen.tsx` | 45 | typescript:S1128 | MINOR | Remove this unused import of 'toastService'. |
| `bottomBarScreens/ProfileScreen.tsx` | 1028 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `bottomBarScreens/ProfileScreen.tsx` | 1050 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `bottomBarScreens/ProfileScreen.tsx` | 1145 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `bottomBarScreens/ProfileScreen.tsx` | 1148 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `bottomBarScreens/ProfileScreen.tsx` | 1186 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `bottomBarScreens/ProfileScreen.tsx` | 1192 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `bottomBarScreens/ProfileScreen.tsx` | 2796 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `components/ItemDetailsModal.tsx` | 196 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 201 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 235 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 247 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/ItemDetailsModal.tsx` | 257 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `bottomBarScreens/SearchScreen.tsx` | 82 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `donationScreens/ItemsScreen.tsx` | 107 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/ItemsScreen.tsx` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `donationScreens/ItemsScreen.tsx` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `donationScreens/ItemsScreen.tsx` | 1152 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/TopBarNavigator.tsx` | 12 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `screens/EditProfileScreen.tsx` | 64 | typescript:S7744 | MINOR | The empty object is useless. |
| `screens/EditProfileScreen.tsx` | 100 | typescript:S7744 | MINOR | The empty object is useless. |
| `utils/toastService.tsx` | 7 | typescript:S4323 | MINOR | Replace this union type with a type alias. |
| `bottomBarScreens/ProfileScreen.tsx` | 29 | typescript:S1128 | MINOR | Remove this unused import of 'useNavigationState'. |
| `bottomBarScreens/ProfileScreen.tsx` | 1130 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `bottomBarScreens/ProfileScreen.tsx` | 1166 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `bottomBarScreens/ProfileScreen.tsx` | 1990 | typescript:S6749 | MINOR | A fragment with only one child is redundant. |
| `bottomBarScreens/ProfileScreen.tsx` | 2064 | typescript:S4325 | MINOR | This assertion is unnecessary since the receiver accepts the original type of the expression. |
| `bottomBarScreens/ProfileScreen.tsx` | 2644 | typescript:S4325 | MINOR | This assertion is unnecessary since the receiver accepts the original type of the expression. |
| `bottomBarScreens/SearchScreen.tsx` | 181 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/DatePicker.tsx` | 10 | typescript:S1128 | MINOR | Remove this unused import of 'TextInput'. |
| `components/DatePicker.tsx` | 11 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `components/DatePicker.tsx` | 17 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `components/DatePicker.tsx` | 31 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/DatePicker.tsx` | 44 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/DatePicker.tsx` | 50 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/HeaderComp.tsx` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'getScreen'. |
| `components/ItemDetailsModal.tsx` | 13 | typescript:S1128 | MINOR | Remove this unused import of 'CommonActions'. |
| `components/ItemDetailsModal.tsx` | 15 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `components/ItemDetailsModal.tsx` | 31 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `components/ItemDetailsModal.tsx` | 117 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 130 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 155 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 163 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 173 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 181 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 267 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ItemDetailsModal.tsx` | 275 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'CommonActions'. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/rides/RideOfferForm.tsx` | 94 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/rides/RideOfferForm.tsx` | 101 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `donationScreens/ItemsScreen.tsx` | 3 | typescript:S1128 | MINOR | Remove this unused import of 'useRoute'. |
| `donationScreens/KnowledgeScreen.tsx` | 143 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/KnowledgeScreen.tsx` | 170 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/MoneyScreen.tsx` | 117 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/MoneyScreen.tsx` | 123 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/TimeScreen.tsx` | 119 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/TimeScreen.tsx` | 133 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/TrumpScreen.tsx` | 57 | typescript:S6644 | MINOR | Unnecessary use of boolean literals in conditional expression. |
| `donationScreens/TrumpScreen.tsx` | 132 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `donationScreens/TrumpScreen.tsx` | 240 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `donationScreens/TrumpScreen.tsx` | 415 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??`) instead of a ternary expression, as it is simpler to read. |
| `donationScreens/TrumpScreen.tsx` | 415 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `donationScreens/TrumpScreen.tsx` | 570 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `donationScreens/TrumpScreen.tsx` | 647 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `donationScreens/TrumpScreen.tsx` | 918 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/AdminMoneyScreen.tsx` | 644 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/LoginScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LoginScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `utils/databaseService.ts` | 646 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `utils/linkingConfig.ts` | 7 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `utils/linkingConfig.ts` | 8 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `utils/linkingConfig.ts` | 36 | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `donationScreens/TrumpScreen.tsx` | 435 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/LoginSidePanel.tsx` | 13 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `components/LoginSidePanel.tsx` | 25 | typescript:S1128 | MINOR | Remove this unused import of 'scaleSize'. |
| `components/LoginSidePanel.tsx` | 25 | typescript:S3863 | MINOR | '../globals/responsive' imported multiple times. |
| `components/LoginSidePanel.tsx` | 26 | typescript:S3863 | MINOR | '../globals/responsive' imported multiple times. |
| `components/PostsReelsScreen.tsx` | - | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/PostsReelsScreen.tsx` | - | typescript:S7735 | MINOR | Unexpected negated condition. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/PostsReelsScreen.tsx` | - | typescript:S7718 | MINOR | The catch parameter `e2` should be named `error_`. |
| `navigations/HomeTabStack.tsx` | 113 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `stores/webModeStore.ts` | 32 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `stores/webModeStore.ts` | 34 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `stores/webModeStore.ts` | 38 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `utils/databaseService.ts` | 864 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/FirebaseGoogleButton.tsx` | 180 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `components/FirebaseGoogleButton.tsx` | 186 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `components/ModeToggleButton.tsx` | 24 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `components/ModeToggleButton.tsx` | 30 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `components/WebModeToggleOverlay.tsx` | 16 | typescript:S1128 | MINOR | Remove this unused import of 'I18nManager'. |
| `screens/CommunityStatsScreen.tsx` | 50 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.legacy.tsx` | 1516 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/NewLoginScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'getSignInMethods'. |
| `screens/NewLoginScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'restAdapter'. |
| `screens/NewLoginScreen.tsx` | - | typescript:S6754 | MINOR | useState call is not destructured into value + setter pair |
| `screens/NewLoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/AddLinkComponent.tsx` | 1 | typescript:S1128 | MINOR | Remove this unused import of 'useEffect'. |
| `components/AddLinkComponent.tsx` | 11 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `components/AddLinkComponent.tsx` | 17 | typescript:S1128 | MINOR | Remove this unused import of 'db'. |
| `components/AddLinkComponent.tsx` | 19 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `components/AddLinkComponent.tsx` | 29 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/AddLinkComponent.tsx` | 178 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/rides/RideHistoryCard.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `components/rides/RideOfferForm.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `components/rides/RideOfferForm.tsx` | 346 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `components/rides/RideOfferForm.tsx` | 346 | typescript:S6353 | MINOR | Use concise character class syntax '\D' instead of '[^0-9]'. |
| `donationScreens/TrumpScreen.tsx` | 8 | typescript:S1128 | MINOR | Remove this unused import of 'ScrollView'. |
| `bottomBarScreens/HomeScreenOld.tsx` | 29 | typescript:S1128 | MINOR | Remove this unused import of 'TouchableOpacity'. |
| `bottomBarScreens/HomeScreenOld.tsx` | 31 | typescript:S1128 | MINOR | Remove this unused import of 'Image'. |
| `bottomBarScreens/HomeScreenOld.tsx` | 32 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `bottomBarScreens/HomeScreenOld.tsx` | 59 | typescript:S1128 | MINOR | Remove this unused import of 'CommunityStatsPanel'. |
| `bottomBarScreens/HomeScreenOld.tsx` | 63 | typescript:S1128 | MINOR | Remove this unused import of 'GuestModeNotice'. |
| `bottomBarScreens/HomeScreenOld.tsx` | 64 | typescript:S1128 | MINOR | Remove this unused import of 'CommunityStatsGrid'. |
| `bottomBarScreens/HomeScreenOld.tsx` | 65 | typescript:S1128 | MINOR | Remove this unused import of 'StatDetailsModal'. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'SafeAreaView'. |
| `components/PostsReelsScreen.tsx` | - | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/PostsReelsScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `navigations/BottomNavigator.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'CommonActions'. |
| `utils/loggerService.ts` | 86 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `utils/loggerService.ts` | 123 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/GuestModeNotice.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'View'. |
| `screens/AdminTasksScreen.tsx` | 262 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/AdminTasksScreen.tsx` | 586 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `stores/webModeStore.ts` | 86 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `stores/webModeStore.ts` | 87 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `types/navigation.ts` | 5 | typescript:S1128 | MINOR | Remove this unused import of 'NavigationAction'. |
| `types/navigation.ts` | 249 | typescript:S6571 | MINOR | "UserProfileScreen" \| "HomeStack" \| "FirstScreen" \| "LoginScreen" \| "LandingSiteScreen" \| "SettingsScreen" \| "ChatListScreen" \| "NewChatScreen" \| "ChatDetailScreen" \| "NotificationsScreen" \| "AboutKarmaCommunityScreen" \| "InactiveScreen" \| "WebViewScreen" \| "PostsReelsScreen" \| "BookmarksScreen" \| "FollowersScreen" \| "DiscoverPeopleScreen" \| "OrgOnboardingScreen" \| "AdminOrgApprovalsScreen" \| "OrgDashboardScreen" \| "EditProfileScreen" \| "AdminDashboard" is overridden by string in this union type. |
| `types/navigation.ts` | 250 | typescript:S6571 | MINOR | "ProfileScreen" \| "HomeScreen" \| "SettingsScreen" \| "ChatListScreen" \| "NotificationsScreen" \| "AboutKarmaCommunityScreen" \| "DonationsTab" \| "SearchTab" \| "AdminTab" is overridden by string in this union type. |
| `types/navigation.ts` | 254 | typescript:S6571 | MINOR | "UserProfileScreen" \| "LandingSiteScreen" \| "SettingsScreen" \| "ChatListScreen" \| "NewChatScreen" \| "ChatDetailScreen" \| "NotificationsScreen" \| "AboutKarmaCommunityScreen" \| "FollowersScreen" \| "DiscoverPeopleScreen" \| "DonationsScreen" \| "MyChallengesScreen" \| "CommunityChallengesScreen" \| "ChallengeDetailsScreen" \| "ChallengeStatisticsScreen" \| "MyCreatedChallengesScreen" \| "MoneyScreen" \| "ItemsScreen" \| "TimeScreen" \| "KnowledgeScreen" \| "TrumpScreen" \| "CategoryScreen" \| "DreamsScreen" \| "FertilityScreen" \| "JobsScreen" \| "MatchmakingScreen" \| "MentalHealthScreen" \| "GoldenAgeScreen" \| "LanguagesScreen" \| "FoodScreen" \| "ClothesScreen" \| "BooksScreen" \| "FurnitureScreen" \| "MedicalScreen" \| "AnimalsScreen" \| "HousingScreen" \| "SupportScreen" \| "EducationScreen" \| "EnvironmentScreen" \| "TechnologyScreen" \| "MusicScreen" \| "GamesScreen" \| "RiddlesScreen" \| "RecipesScreen" \| "PlantsScreen" \| "WasteScreen" \| "ArtScreen" \| "SportsScreen" is overridden by string in this union type. |
| `types/navigation.ts` | 255 | typescript:S6571 | MINOR | "LandingSiteScreen" \| "SettingsScreen" \| "ChatListScreen" \| "NewChatScreen" \| "ChatDetailScreen" \| "NotificationsScreen" \| "AboutKarmaCommunityScreen" \| "DiscoverPeopleScreen" \| "AdminDashboard" \| "AdminMoney" \| "AdminPeople" \| "AdminReview" \| "AdminTasks" \| "AdminTimeManagement" \| "AdminAdmins" \| "AdminFiles" \| "AdminCRM" \| "AdminTables" \| "AdminTableRows" is overridden by string in this union type. |
| `utils/navigationGuards.ts` | 12 | typescript:S1128 | MINOR | Remove this unused import of 'isValidRouteName'. |
| `utils/navigationQueue.ts` | 240 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/navigationStateValidator.ts` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'CURRENT_NAVIGATION_STATE_VERSION'. |
| `utils/navigationStateValidator.ts` | 11 | typescript:S1128 | MINOR | Remove this unused import of 'AllRouteNames'. |
| `utils/navigationStateValidator.ts` | 56 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `App.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'useState'. |
| `App.tsx` | 52 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `components/ScrollContainer.tsx` | 49 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/ScrollContainer.tsx` | 104 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `components/ScrollContainer.tsx` | 104 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `components/ScrollContainer.tsx` | 105 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `components/ScrollContainer.tsx` | 109 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `components/ScrollContainer.tsx` | 110 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/ScrollContainer.tsx` | 170 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `components/ScrollContainer.tsx` | 170 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `components/ScrollContainer.tsx` | 171 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 6 | typescript:S1128 | MINOR | Remove this unused import of 'useLayoutEffect'. |
| `hooks/useScrollPosition.ts` | 78 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `hooks/useScrollPosition.ts` | 78 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 79 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 87 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `hooks/useScrollPosition.ts` | 88 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `hooks/useScrollPosition.ts` | 183 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `hooks/useScrollPosition.ts` | 183 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 184 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 254 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `hooks/useScrollPosition.ts` | 254 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 255 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 289 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `hooks/useScrollPosition.ts` | 289 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 290 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `hooks/useScrollPosition.ts` | 297 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `hooks/useScrollPosition.ts` | 298 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/AdminMoneyScreen.tsx` | 15 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `utils/navigationPersistence.ts` | 89 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/navigationPersistence.ts` | 89 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 90 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 155 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/navigationPersistence.ts` | 155 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 156 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 254 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/navigationPersistence.ts` | 254 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 255 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 275 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/navigationPersistence.ts` | 275 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 276 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/navigationPersistence.ts` | 279 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `globals/styles.tsx` | 44 | typescript:S6594 | MINOR | Use the "RegExp.exec()" method instead. |
| `globals/styles.tsx` | 53 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `globals/styles.tsx` | 54 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `globals/styles.tsx` | 55 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/ChatDetailScreen.tsx` | 139 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/ChatDetailScreen.tsx` | 143 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/ChatDetailScreen.tsx` | 147 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/NotificationsScreen.tsx` | 178 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `utils/chatService.ts` | 392 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `bottomBarScreens/DonationsScreen.tsx` | 195 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.legacy.tsx` | 1289 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.legacy.tsx` | 1401 | typescript:S1199 | MINOR | Block is redundant. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S1199 | MINOR | Block is redundant. |
| `components/AboutButton.tsx` | 53 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `app/oauthredirect.tsx` | 17 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `app/oauthredirect.tsx` | 17 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `app/oauthredirect.tsx` | 21 | typescript:S7758 | MINOR | Prefer `String#codePointAt()` over `String#charCodeAt()`. |
| `app/oauthredirect.tsx` | 39 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `app/oauthredirect.tsx` | 135 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `public/oauth-callback.html` | 57 | javascript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `public/oauth-callback.html` | 57 | javascript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `public/oauth-callback.html` | 61 | javascript:S7758 | MINOR | Prefer `String#codePointAt()` over `String#charCodeAt()`. |
| `public/oauth-callback.html` | 72 | javascript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `public/oauth-callback.html` | 86 | javascript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `Dockerfile` | 10 | docker:S7020 | MINOR | Line is too long. Split it into multiple lines using backslash continuations. |
| `Dockerfile` | 43 | docker:S7020 | MINOR | Line is too long. Split it into multiple lines using backslash continuations. |
| `components/WebModeToggleOverlay.tsx` | 23 | typescript:S1128 | MINOR | Remove this unused import of 'FontSizes'. |
| `context/WebModeContext.tsx` | 47 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `context/WebModeContext.tsx` | 47 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `context/WebModeContext.tsx` | 55 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `context/WebModeContext.tsx` | 55 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `donationScreens/MoneyScreen.tsx` | 548 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `Dockerfile` | 44 | docker:S7020 | MINOR | Line is too long. Split it into multiple lines using backslash continuations. |
| `scripts/run-local-e2e.sh` | 781 | shelldre:S1192 | MINOR | Define a constant instead of using the literal '═══════════════════════════════════════════════════════════════' 5 times. |
| `stores/appLoadingStore.ts` | 159 | typescript:S7770 | MINOR | arrow function is equivalent to `Boolean`. Use `Boolean` directly. |
| `stores/userStore.ts` | 70 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `stores/webModeStore.ts` | 50 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `stores/webModeStore.ts` | 51 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `stores/webModeStore.ts` | 53 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `stores/webModeStore.ts` | 64 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `stores/webModeStore.ts` | 65 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `stores/webModeStore.ts` | 67 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `stores/webModeStore.ts` | 80 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `stores/webModeStore.ts` | 80 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `stores/webModeStore.ts` | 80 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `stores/webModeStore.ts` | 90 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `Dockerfile.static` | 8 | docker:S7020 | MINOR | Line is too long. Split it into multiple lines using backslash continuations. |
| `utils/databaseService.ts` | 28 | typescript:S7763 | MINOR | Use `export…from` to re-export `DB_COLLECTIONS`. |
| `utils/databaseService.ts` | 21 | typescript:S1128 | MINOR | Remove this unused import of 'CACHE_CONFIG'. |
| `utils/databaseService.ts` | 21 | typescript:S1128 | MINOR | Remove this unused import of 'OFFLINE_CONFIG'. |
| `utils/databaseService.ts` | 21 | typescript:S1128 | MINOR | Remove this unused import of 'STORAGE_KEYS'. |
| `utils/dbConfig.ts` | 4 | typescript:S7763 | MINOR | Use `export…from` to re-export `IS_DEVELOPMENT`. |
| `utils/dbConfig.ts` | 4 | typescript:S7763 | MINOR | Use `export…from` to re-export `IS_PRODUCTION`. |
| `utils/dbConfig.ts` | 4 | typescript:S7763 | MINOR | Use `export…from` to re-export `USE_BACKEND`. |
| `utils/dbConfig.ts` | 4 | typescript:S7763 | MINOR | Use `export…from` to re-export `USE_FIRESTORE`. |
| `utils/apiService.ts` | 982 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read. |
| `utils/apiService.ts` | 58 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read. |
| `screens/LandingSiteScreen.legacy.tsx` | 557 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.legacy.tsx` | 1689 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.legacy.tsx` | 1703 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.legacy.tsx` | 1718 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.legacy.tsx` | 1728 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/LandingSiteScreen.legacy.tsx` | 45 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/AdminMoneyScreen.tsx` | 222 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/AdminMoneyScreen.tsx` | 278 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/AdminMoneyScreen.tsx` | 279 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/AdminMoneyScreen.tsx` | 280 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/AdminMoneyScreen.tsx` | 299 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/AdminMoneyScreen.tsx` | 300 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/AdminMoneyScreen.tsx` | 301 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `screens/AdminMoneyScreen.tsx` | 443 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/AdminMoneyScreen.tsx` | 459 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/CommunityStatsGrid.tsx` | 11 | typescript:S1128 | MINOR | Remove this unused import of 'enhancedDB'. |
| `utils/enhancedDatabaseService.ts` | 442 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `screens/AdminMoneyScreen.tsx` | 235 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/AdminMoneyScreen.tsx` | 377 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `screens/AdminMoneyScreen.tsx` | 377 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `screens/AdminTasksScreen.tsx` | 97 | typescript:S6571 | MINOR | "" is overridden by string in this union type. |
| `screens/AdminTasksScreen.tsx` | 141 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `utils/authService.ts` | 30 | typescript:S1128 | MINOR | Remove this unused import of 'inMemoryPersistence'. |
| `utils/authService.ts` | 33 | typescript:S1128 | MINOR | Remove this unused import of 'AsyncStorage'. |
| `utils/enhancedDatabaseService.ts` | 281 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `context/UserContext.tsx` | 253 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LoginScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LoginScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LoginScreen.tsx` | - | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/dbConfig.ts` | 1 | typescript:S1128 | MINOR | Remove this unused import of 'Constants'. |
| `globals/styles.tsx` | 7 | typescript:S1128 | MINOR | Remove this unused import of 'getScreenInfo'. |
| `globals/styles.tsx` | 8 | typescript:S1128 | MINOR | Remove this unused import of 'getResponsiveButtonStyles'. |
| `globals/styles.tsx` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'getResponsiveContainerStyles'. |
| `globals/styles.tsx` | 10 | typescript:S1128 | MINOR | Remove this unused import of 'getResponsiveModalStyles'. |
| `globals/styles.tsx` | 11 | typescript:S1128 | MINOR | Remove this unused import of 'getResponsiveMenuStyles'. |
| `globals/styles.tsx` | 12 | typescript:S1128 | MINOR | Remove this unused import of 'responsiveSpacing'. |
| `globals/styles.tsx` | 13 | typescript:S1128 | MINOR | Remove this unused import of 'responsiveFontSize'. |
| `globals/styles.tsx` | 14 | typescript:S1128 | MINOR | Remove this unused import of 'responsiveWidth'. |
| `globals/styles.tsx` | 15 | typescript:S1128 | MINOR | Remove this unused import of 'BREAKPOINTS'. |
| `components/OrganizationLoginForm.tsx` | 23 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `google_auth/AuthConfiguration.ts` | 422 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `google_auth/AuthConfiguration.ts` | 422 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `google_auth/AuthConfiguration.ts` | 423 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `google_auth/GoogleAuthService.ts` | 209 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??=`) instead of an assignment expression, as it is simpler to read. |
| `google_auth/GoogleAuthService.ts` | 794 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `google_auth/SecureApiService.ts` | 36 | typescript:S1128 | MINOR | Remove this unused import of 'AuthResponse'. |
| `google_auth/SecureApiService.ts` | 146 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `google_auth/SecureApiService.ts` | 638 | typescript:S7773 | MINOR | Prefer `Number.parseInt` over `parseInt`. |
| `google_auth/index.ts` | 178 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `google_auth/index.ts` | 254 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `google_auth/index.ts` | 254 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `google_auth/index.ts` | 256 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `google_auth/index.ts` | 276 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `google_auth/types/ApiTypes.ts` | 316 | typescript:S4323 | MINOR | Replace this union type with a type alias. |
| `google_auth/utils/ErrorHandler.ts` | 737 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `google_auth/utils/SecureStorage.ts` | 191 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `google_auth/utils/SecureStorage.ts` | 286 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `google_auth/utils/SecureStorage.ts` | 405 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `google_auth/utils/SecureStorage.ts` | 410 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `google_auth/utils/SecureStorage.ts` | 462 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `google_auth/utils/SecureStorage.ts` | 541 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `google_auth/utils/SecureStorage.ts` | 621 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `navigations/AdminStack.tsx` | 51 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/AdminStack.tsx` | 52 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/AdminDashboardScreen.tsx` | 6 | typescript:S1128 | MINOR | Remove this unused import of 'SafeAreaView'. |
| `screens/AdminDashboardScreen.tsx` | 101 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminMoneyScreen.tsx` | 81 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminMoneyScreen.tsx` | 258 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `screens/AdminPeopleScreen.tsx` | 57 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/AdminReviewScreen.tsx` | 14 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `utils/authTestUtils.ts` | 273 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `utils/authTestUtils.ts` | 317 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `scripts/testAuth.js` | 8 | javascript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/testAuth.js` | 9 | javascript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/testAuth.js` | 150 | javascript:S7772 | MINOR | Prefer `node:https` over `https`. |
| `utils/authTestUtils.ts` | 42 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `utils/authTestUtils.ts` | 61 | typescript:S7778 | MINOR | Do not call `Array#push()` multiple times. |
| `utils/authTestUtils.ts` | 197 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `context/AppLoadingContext.tsx` | 156 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `context/AppLoadingContext.tsx` | 201 | typescript:S7770 | MINOR | arrow function is equivalent to `Boolean`. Use `Boolean` directly. |
| `utils/enhancedDatabaseService.ts` | 625 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/loggerService.ts` | 13 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `utils/loggerService.ts` | 14 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `navigations/BottomNavigator.tsx` | 247 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `navigations/HomeTabStack.tsx` | 61 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `topBarScreens/AboutKarmaCommunityScreen.tsx` | 10 | typescript:S1128 | MINOR | Remove this unused import of 'SafeAreaView'. |
| `topBarScreens/AboutKarmaCommunityScreen.tsx` | 10 | typescript:S1128 | MINOR | Remove this unused import of 'TouchableOpacity'. |
| `topBarScreens/AboutKarmaCommunityScreen.tsx` | 21 | typescript:S6749 | MINOR | A fragment with only one child is redundant. |
| `context/WebModeContext.tsx` | 27 | typescript:S6754 | MINOR | useState call is not destructured into value + setter pair |
| `context/WebModeContext.tsx` | 33 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `context/WebModeContext.tsx` | 33 | typescript:S7764 | MINOR | Prefer `globalThis.window` over `window`. |
| `context/WebModeContext.tsx` | 33 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `context/WebModeContext.tsx` | 39 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/LandingSiteScreen.legacy.tsx` | 7 | typescript:S1128 | MINOR | Remove this unused import of 'FontSizes'. |
| `screens/LandingSiteScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'FontSizes'. |
| `utils/databaseService.ts` | 647 | typescript:S7786 | MINOR | `new Error()` is too unspecific for a type check. Use `new TypeError()` instead. |
| `components/DonationStatsFooter.tsx` | 37 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/FloatingBubblesOverlay.tsx` | 209 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `components/FloatingBubblesOverlay.tsx` | 384 | typescript:S7769 | MINOR | Prefer `Math.hypot(…)` over `Math.sqrt(…)`. |
| `components/FloatingBubblesOverlay.tsx` | 625 | typescript:S7769 | MINOR | Prefer `Math.hypot(…)` over `Math.sqrt(…)`. |
| `navigations/BottomNavigator.tsx` | 23 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `components/CommunityStatsGrid.tsx` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'parseShortNumber'. |
| `utils/apiService.ts` | 956 | typescript:S6606 | MINOR | Prefer using nullish coalescing operator (`??`) instead of a logical or (`\|\|`), as it is a safer operator. |
| `utils/databaseService.ts` | 22 | typescript:S1128 | MINOR | Remove this unused import of 'ApiResponse'. |
| `utils/databaseService.ts` | 79 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `utils/enhancedDatabaseService.ts` | 189 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `utils/restAdapter.ts` | 53 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `bottomBarScreens/DonationsScreen.tsx` | 155 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `bottomBarScreens/DonationsScreen.tsx` | 297 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/CommunityStatsGrid.tsx` | 8 | typescript:S3863 | MINOR | 'react' imported multiple times. |
| `components/CommunityStatsGrid.tsx` | 107 | typescript:S6571 | MINOR | "activeMembers" is overridden by string in this union type. |
| `components/DonationStatsScreen.tsx` | - | typescript:S4158 | MINOR | Review this usage of "charities" as it can only be empty here. |
| `donationScreens/MoneyScreen.tsx` | 46 | typescript:S4158 | MINOR | Review this usage of "donations" as it can only be empty here. |
| `utils/chatService.ts` | 907 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `utils/statsService.ts` | 121 | typescript:S7773 | MINOR | Prefer `Number.isFinite` over `isFinite`. |
| `utils/statsService.ts` | 136 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `utils/statsService.ts` | 136 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `utils/statsService.ts` | 137 | typescript:S7773 | MINOR | Prefer `Number.isFinite` over `isFinite`. |
| `components/ProfileCompletionBanner.tsx` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `screens/EditProfileScreen.tsx` | 297 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/EditProfileScreen.tsx` | 331 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/LoginScreen.tsx` | 35 | typescript:S1128 | MINOR | Remove this unused import of 'restAdapter'. |
| `screens/LoginScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'fbIsEmailVerified'. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/LoginScreen.tsx` | - | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `donationScreens/CategoryScreen.tsx` | 144 | typescript:S7736 | MINOR | Negated expression is not allowed in equality check. |
| `donationScreens/CategoryScreen.tsx` | 151 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `donationScreens/MoneyScreen.tsx` | 154 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `screens/AdminOrgApprovalsScreen.tsx` | 82 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `screens/OrgOnboardingScreen.tsx` | 96 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `bottomBarScreens/DonationsScreen.tsx` | 366 | typescript:S4158 | MINOR | Review this usage of "donations" as it can only be empty here. |
| `bottomBarScreens/DonationsScreen.tsx` | 370 | typescript:S4158 | MINOR | Review this usage of "donations" as it can only be empty here. |
| `bottomBarScreens/ProfileScreen.tsx` | 2211 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `app/i18n.ts` | 8 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `donationScreens/CategoryScreen.tsx` | 7 | typescript:S1128 | MINOR | Remove this unused import of 'scaleSize'. |
| `utils/firebaseClient.ts` | 40 | typescript:S7735 | MINOR | Unexpected negated condition. |
| `utils/firebaseClient.ts` | 75 | typescript:S7763 | MINOR | Use `export…from` to re-export `Firestore`. |
| `utils/firestoreAdapter.ts` | 48 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/AutocompleteDropdownComp.tsx` | 30 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/TimeInput.tsx` | 33 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `components/TimePicker.tsx` | 22 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `navigations/BottomNavigator.tsx` | 32 | typescript:S1128 | MINOR | Remove this unused import of 'BookmarksScreen'. |
| `topBarScreens/SettingsScreen.tsx` | 271 | typescript:S7764 | MINOR | Prefer `globalThis` over `window`. |
| `App.tsx` | 37 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `topBarScreens/SettingsScreen.tsx` | 46 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `components/CommunityStatsGrid.tsx` | 1 | typescript:S3863 | MINOR | 'react' imported multiple times. |
| `components/StatDetailsModal.tsx` | 41 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `donationScreens/ItemsScreen.tsx` | 97 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `donationScreens/KnowledgeScreen.tsx` | 15 | typescript:S1128 | MINOR | Remove this unused import of 'DonationStatsFooter'. |
| `globals/responsive.ts` | 1 | typescript:S1128 | MINOR | Remove this unused import of 'ScaledSize'. |
| `navigations/TopBarNavigator.tsx` | 18 | typescript:S1128 | MINOR | Remove this unused import of 'rowDirection'. |
| `topBarScreens/SettingsScreen.tsx` | 38 | typescript:S1128 | MINOR | Remove this unused import of 'getScreenInfo'. |
| `topBarScreens/SettingsScreen.tsx` | 38 | typescript:S1128 | MINOR | Remove this unused import of 'scaleSize'. |
| `donationScreens/MoneyScreen.tsx` | 1 | typescript:S1128 | MINOR | Remove this unused import of 'useRef'. |
| `donationScreens/MoneyScreen.tsx` | 16 | typescript:S1128 | MINOR | Remove this unused import of 'PanResponder'. |
| `donationScreens/MoneyScreen.tsx` | 222 | typescript:S6571 | MINOR | 'any' overrides all other types in this union type. |
| `donationScreens/MoneyScreen.tsx` | 541 | typescript:S2486 | MINOR | Handle this exception or don't catch it at all. |
| `donationScreens/MoneyScreen.tsx` | 822 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `donationScreens/MoneyScreen.tsx` | 822 | typescript:S6353 | MINOR | Use concise character class syntax '\D' instead of '[^0-9]'. |
| `donationScreens/MoneyScreen.tsx` | 844 | typescript:S6749 | MINOR | A fragment with only one child is redundant. |
| `bottomBarScreens/DonationsScreen.tsx` | 177 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/BottomNavigator.tsx` | 245 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/DonationsStack.tsx` | 82 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/DonationsStack.tsx` | 83 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/HomeTabStack.tsx` | 112 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/HomeTabStack.tsx` | 114 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/ProfileTabStack.tsx` | 58 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `navigations/SearchTabStack.tsx` | 57 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/ScreenWrapper.tsx` | 15 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `navigations/BottomNavigator.tsx` | 33 | typescript:S1128 | MINOR | Remove this unused import of 'SettingsScreen'. |
| `navigations/BottomNavigator.tsx` | 34 | typescript:S1128 | MINOR | Remove this unused import of 'ChatListScreen'. |
| `navigations/BottomNavigator.tsx` | 35 | typescript:S1128 | MINOR | Remove this unused import of 'AboutKarmaCommunityScreen'. |
| `navigations/BottomNavigator.tsx` | 36 | typescript:S1128 | MINOR | Remove this unused import of 'NotificationsScreen'. |
| `navigations/BottomNavigator.tsx` | 255 | typescript:S6767 | MINOR | 'focused' PropType is defined but prop is never used |
| `navigations/BottomNavigator.tsx` | 255 | typescript:S6767 | MINOR | 'color' PropType is defined but prop is never used |
| `navigations/BottomNavigator.tsx` | 255 | typescript:S6767 | MINOR | 'size' PropType is defined but prop is never used |
| `navigations/TopBarNavigator.tsx` | 13 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `navigations/TopBarNavigator.tsx` | 30 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `App.tsx` | 26 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `screens/LoginScreen.tsx` | - | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `screens/NewChatScreen.tsx` | 28 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `screens/NewChatScreen.tsx` | 29 | typescript:S1128 | MINOR | Remove this unused import of 'ParamListBase'. |
| `screens/NewChatScreen.tsx` | 29 | typescript:S3863 | MINOR | '@react-navigation/native' imported multiple times. |
| `screens/NotificationsScreen.tsx` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'useEffect'. |
| `screens/NotificationsScreen.tsx` | 34 | typescript:S1128 | MINOR | Remove this unused import of 'getNotificationSettings'. |
| `screens/NotificationsScreen.tsx` | 35 | typescript:S1128 | MINOR | Remove this unused import of 'updateNotificationSettings'. |
| `utils/chatService.ts` | 1 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `utils/chatService.ts` | 1090 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/databaseService.ts` | 207 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/databaseService.ts` | 207 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/databaseService.ts` | 208 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/databaseService.ts` | 208 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `utils/fileService.ts` | 4 | typescript:S1128 | MINOR | Remove this unused import of 'FileSystem'. |
| `utils/fileService.ts` | 60 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `utils/fileService.ts` | 102 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `utils/fileService.ts` | 140 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `utils/fileService.ts` | 173 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `utils/fileService.ts` | 231 | typescript:S7773 | MINOR | Prefer `Number.parseFloat` over `parseFloat`. |
| `utils/followService.ts` | 2 | typescript:S1128 | MINOR | Remove this unused import of 'DB_COLLECTIONS'. |
| `bottomBarScreens/ProfileScreen.tsx` | 10 | typescript:S1128 | MINOR | Remove this unused import of 'useRef'. |
| `donationScreens/KnowledgeScreen.tsx` | 129 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `donationScreens/TimeScreen.tsx` | 105 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/FollowersScreen.tsx` | 8 | typescript:S1128 | MINOR | Remove this unused import of 'useCallback'. |
| `topBarScreens/SettingsScreen.tsx` | 21 | typescript:S1128 | MINOR | Remove this unused import of 'useRef'. |
| `components/DonationStatsScreen.tsx` | - | typescript:S4158 | MINOR | Review this usage of "charities" as it can only be empty here. |
| `components/DonationStatsScreen.tsx` | - | typescript:S4158 | MINOR | Review this usage of "charities" as it can only be empty here. |
| `components/DonationStatsScreen.tsx` | - | typescript:S4158 | MINOR | Review this usage of "charities" as it can only be empty here. |
| `scripts/testFollowSystem.js` | 7 | javascript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/testFollowSystem.js` | 8 | javascript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/testFollowSystem.js` | 70 | javascript:S7776 | MINOR | `followerIds` should be a `Set`, and use `followerIds.has()` to check existence or non-existence. |
| `scripts/testFollowSystem.js` | 78 | javascript:S7776 | MINOR | `followingIds` should be a `Set`, and use `followingIds.has()` to check existence or non-existence. |
| `scripts/testFollowSystem.js` | 86 | javascript:S7776 | MINOR | `alreadyFollowing` should be a `Set`, and use `alreadyFollowing.has()` to check existence or non-existence. |
| `scripts/testUnifiedSystem.js` | 7 | javascript:S7772 | MINOR | Prefer `node:fs` over `fs`. |
| `scripts/testUnifiedSystem.js` | 8 | javascript:S7772 | MINOR | Prefer `node:path` over `path`. |
| `scripts/testUnifiedSystem.js` | 91 | javascript:S7776 | MINOR | `followerIds` should be a `Set`, and use `followerIds.has()` to check existence or non-existence. |
| `scripts/testUnifiedSystem.js` | 99 | javascript:S7776 | MINOR | `followingIds` should be a `Set`, and use `followingIds.has()` to check existence or non-existence. |
| `scripts/testUnifiedSystem.js` | 107 | javascript:S7776 | MINOR | `alreadyFollowing` should be a `Set`, and use `alreadyFollowing.has()` to check existence or non-existence. |
| `components/DonationStatsScreen.tsx` | 16 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `components/DonationStatsScreen.tsx` | 41 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `components/DonationStatsScreen.tsx` | 86 | typescript:S7769 | MINOR | Prefer `Math.hypot(…)` over `Math.sqrt(…)`. |
| `components/GuestModeNotice.tsx` | 3 | typescript:S1128 | MINOR | Remove this unused import of 'Ionicons'. |
| `donationScreens/MoneyScreen.tsx` | 56 | typescript:S1128 | MINOR | Remove this unused import of 'Icon'. |
| `topBarScreens/AboutKarmaCommunityScreen.tsx` | 12 | typescript:S1128 | MINOR | Remove this unused import of 'Icon'. |
| `topBarScreens/SettingsScreen.tsx` | 28 | typescript:S1128 | MINOR | Remove this unused import of 'SafeAreaView'. |
| `topBarScreens/SettingsScreen.tsx` | 34 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `App.tsx` | 25 | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `context/UserContext.tsx` | 83 | typescript:S6754 | MINOR | useState call is not destructured into value + setter pair |
| `screens/LoginScreen.tsx` | - | typescript:S1128 | MINOR | Remove this unused import of 'ScrollView'. |
| `screens/LoginScreen.tsx` | - | typescript:S3863 | MINOR | 'react-native' imported multiple times. |
| `utils/bookmarksService.ts` | 54 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `utils/chatService.ts` | 82 | typescript:S1874 | MINOR | '(from: number, length?: number \| undefined): string' is deprecated. |
| `bottomBarScreens/ProfileScreen.tsx` | 2703 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/CommunityStatsPanel.tsx` | 1 | typescript:S1128 | MINOR | Remove this unused import of 'useEffect'. |
| `components/CommunityStatsPanel.tsx` | 8 | typescript:S1128 | MINOR | Remove this unused import of 'runOnJS'. |
| `components/CommunityStatsPanel.tsx` | 30 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `components/HeaderComp.tsx` | 35 | typescript:S6767 | MINOR | 'title' PropType is defined but prop is never used |
| `donationScreens/KnowledgeScreen.tsx` | 342 | typescript:S4325 | MINOR | This assertion is unnecessary since it does not change the type of the expression. |
| `donationScreens/MoneyScreen.tsx` | 7 | typescript:S1128 | MINOR | Remove this unused import of 'FlatList'. |
| `donationScreens/MoneyScreen.tsx` | 399 | typescript:S7781 | MINOR | Prefer `String#replaceAll()` over `String#replace()`. |
| `donationScreens/MoneyScreen.tsx` | 426 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `donationScreens/TrumpScreen.tsx` | 42 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `screens/WebViewScreen.tsx` | 15 | typescript:S1128 | MINOR | Remove this unused import of 'TouchableOpacity'. |
| `utils/RTLConfig.ts` | 4 | typescript:S7776 | MINOR | `RTL_LANGUAGES` should be a `Set`, and use `RTL_LANGUAGES.has()` to check existence or non-existence. |
| `components/SettingsItem.tsx` | 6 | typescript:S1128 | MINOR | Remove this unused import of 'Platform'. |
| `utils/RTLConfig.ts` | 40 | typescript:S4323 | MINOR | Replace this union type with a type alias. |
| `components/TimeInput.tsx` | 76 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/TimeInput.tsx` | 76 | typescript:S7773 | MINOR | Prefer `Number.isNaN` over `isNaN`. |
| `components/SearchBar.tsx` | 11 | typescript:S1128 | MINOR | Remove this unused import of 'Alert'. |
| `globals/styles.tsx` | 1 | typescript:S1128 | MINOR | Remove this unused import of 'Dimensions'. |
| `topBarScreens/AboutKarmaCommunityScreen.tsx` | 13 | typescript:S1128 | MINOR | Remove this unused import of 'styles'. |
| `donationScreens/MoneyScreen.tsx` | 96 | typescript:S6759 | MINOR | Mark the props of the component as read-only. |
| `bottomBarScreens/ProfileScreen.tsx` | 27 | typescript:S1128 | MINOR | Remove this unused import of 'SceneMap'. |
| `bottomBarScreens/ProfileScreen.tsx` | 27 | typescript:S1128 | MINOR | Remove this unused import of 'TabBar'. |
| `donationScreens/MoneyScreen.tsx` | 9 | typescript:S1128 | MINOR | Remove this unused import of 'Image'. |
| `babel.config.js` | 5 | javascript:S7726 | MINOR | The function should be named. |
| `components/PostsReelsScreen.tsx` | 142 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `hooks/usePostInteractions.ts` | 101 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/__tests__/authService.test.ts` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/ProfileScreen.tsx` | 2114 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/AddLinkComponent.tsx` | 52 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/AddLinkComponent.tsx` | 137 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 20 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 21 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 22 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 74 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 75 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 76 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 151 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 152 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 153 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 154 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 349 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 350 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 351 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 352 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 353 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 354 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 367 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/HomeScreenOld.tsx` | 368 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 139 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 141 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 213 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 215 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 552 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 280 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 295 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 296 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 297 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 379 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 380 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/followService.ts` | 381 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 226 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 227 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 228 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 59 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 60 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 61 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 67 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 68 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 69 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 70 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 166 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 178 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 180 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 184 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 186 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 250 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 270 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 271 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 333 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 347 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 358 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 474 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 488 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 622 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 639 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/AuthConfiguration.ts` | 758 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 890 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 891 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 892 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 893 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 894 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 895 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 896 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 897 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 898 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/GoogleAuthService.ts` | 899 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/SecureApiService.ts` | 22 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/SecureApiService.ts` | 1043 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/SecureApiService.ts` | 1047 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/SecureApiService.ts` | 1048 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/SecureApiService.ts` | 1126 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/index.ts` | 381 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/index.ts` | 382 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/utils/ErrorHandler.ts` | 813 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `google_auth/utils/ErrorHandler.ts` | 826 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 20 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 21 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 22 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `App.tsx` | 23 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 20 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 21 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 22 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 68 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 69 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 70 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 71 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 72 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 113 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 114 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 115 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `bottomBarScreens/DonationsScreen.tsx` | 116 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 20 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 21 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 22 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 23 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 24 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 26 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 27 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 28 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 29 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 40 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/HeaderComp.tsx` | 41 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `components/PostsReelsScreen.tsx` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 7 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `context/UserContext.tsx` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 4 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 5 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 6 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 7 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 8 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 10 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 98 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 99 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/constants.tsx` | 100 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 3 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 4 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 5 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 6 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 7 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 8 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 10 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 69 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 70 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 71 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 72 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/responsive.ts` | 75 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 24 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 25 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 26 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 27 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 28 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 29 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 30 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 31 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 32 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 64 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 65 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 66 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 67 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 68 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 79 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `globals/styles.tsx` | 87 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 20 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 61 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 62 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 63 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `navigations/BottomNavigator.tsx` | 64 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 8 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 10 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 39 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 40 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 41 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 42 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 51 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 52 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 53 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 54 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 65 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 66 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 8 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 10 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | - | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/apiService.ts` | 257 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 7 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 8 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 10 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/authService.ts` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 9 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 21 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 22 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 23 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 73 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 74 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 75 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 76 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 86 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 87 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 88 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 89 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 90 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 8 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 10 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 11 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 17 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 18 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 47 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 48 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 49 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 52 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/databaseService.ts` | 53 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 7 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 12 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 13 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 14 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 15 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 16 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 19 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 20 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 21 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 28 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 29 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 30 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 109 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 110 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 111 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 132 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 133 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 134 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 135 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/enhancedDatabaseService.ts` | 139 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 232 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 240 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 241 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 248 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 254 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 261 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 268 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `screens/BookmarksScreen.tsx` | 278 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |
| `utils/chatService.ts` | 509 | typescript:S1135 | INFO | Complete the task associated to this "TODO" comment. |

---

*Generated from SonarCloud. Run: `SONAR_TOKEN=xxx node sonar/sonar-report.js` from repo root.*
