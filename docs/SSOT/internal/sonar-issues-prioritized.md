# SonarQube troubleshooting priority plan

**Date:** 2026-04-27
**Scan from SonarCloud:** https://sonarcloud.io

**Issue scope:** Counts reflect **OPEN** issues only (`issueStatuses=OPEN`), i.e. the current SonarCloud backlog (not all-time history).

---

## Status summary

### General statistics

- **Total problems:** 2162
- **BLOCKER:** 0 ✅
- **CRITICAL:** 140 ⚠️
- **MAJOR:** 723
- **MINOR:** 949
- **INFO:** 350

### Segmentation by project

#### apps/api (Backend)
- Total: 344 problems
- CRITICAL: 51
- MAJOR: 59
- MINOR: 183
- INFO: 51

#### apps/mobile (React Native)
- Total: 1818 problems
- CRITICAL: 89
- MAJOR: 664
- MINOR: 766
- INFO: 299

### Segmentation by type

- **CODE_SMELL:** 2147 (99.3%)
- **BUG:** 13
- **VULNERABILITY:** 2 🔴
- **SECURITY_HOTSPOT:** 0

---

## 📋 Priority 1: CRITICAL Issues (140)

### Top Rules - API

#### typescript:S3776 - Cognitive Complexity - functions are too complex
- **Quantity:** 29 problems
- **Affected files:**
  - `src/controllers/posts.controller.ts` (6)
  - `src/services/user-hierarchy.service.ts` (4)
  - `src/controllers/tasks.controller.ts` (3)
  - `src/controllers/sync.controller.ts` (2)
  - `src/controllers/items-delivery.service.ts` (2)

#### plsql:S1192 - SQL: String literals duplication
- **Quantity:** 19 problems
- **Affected files:**
  - `src/database/schema.sql` (9)
  - `src/database/migration-unify-users.sql` (4)
  - `src/database/migration-likes-comments.sql` (2)
  - `src/database/community-group-challenges-schema.sql` (1)
  - `src/database/migration-add-missing-columns.sql` (1)

#### plsql:LiteralsNonPrintableCharactersCheck - plsql:LiteralsNonPrintableCharactersCheck
- **Quantity:** 3 problems
- **Affected files:**
  - `src/database/schema.sql` (2)
  - `src/database/migration-fix-schema-sync.sql` (1)

### Top Rules - Mobile

#### typescript:S3776 - Cognitive Complexity - functions are too complex
- **Quantity:** 73 problems
- **Affected files:**
  - `bottomBarScreens/ProfileScreen.tsx` (7)
  - `globals/responsive.ts` (5)
  - `donationScreens/ItemsScreen.tsx` (3)
  - `donationScreens/TrumpScreen.tsx` (3)
  - `screens/AdminTasksScreen.tsx` (3)

#### typescript:S2004 - Functions should not be nested too deeply
- **Quantity:** 13 problems
- **Affected files:**
  - `donationScreens/ItemsScreen.tsx` (5)
  - `hooks/useScrollPosition.ts` (2)
  - `components/CommentsModal.tsx` (1)
  - `bottomBarScreens/ProfileScreen.tsx` (1)
  - `donationScreens/TrumpScreen.tsx` (1)

#### typescript:S7059 - Constructors should not contain asynchronous operations
- **Quantity:** 2 problems
- **Affected files:**
  - `utils/loggerService.ts` (1)
  - `utils/enhancedDatabaseService.ts` (1)

#### javascript:S3776 - Cognitive Complexity - functions are too complex
- **Quantity:** 1 problems
- **Affected files:**
  - `scripts/testAuth.js` (1)

---

## 📋 Priority 2: MAJOR Issues (723)

### Top 10 Rules with the most MAJOR issues

- **typescript:S3358**: 289 problems - Ternary operators - redundant or complex use
- **typescript:S1854**: 124 problems - Dead stores - unused variables
- **typescript:S6582**: 87 problems - Prefer template literals
- **typescript:S125**: 52 problems - Sections of code should not be commented out
- **typescript:S2933**: 34 problems - typescript:S2933
- **typescript:S6479**: 19 problems - JSX list components should not use array indexes as key
- **typescript:S6590**: 15 problems - typescript:S6590
- **typescript:S6478**: 11 problems - React components should not be nested
- **shelldre:S7682**: 11 problems - shelldre:S7682
- **typescript:S6660**: 9 problems - typescript:S6660

---

## 📊 Analysis by problematic files

### Top 10 files with the most problems - API

1. `src/controllers/stats.controller.ts` - 67 issues
2. `src/controllers/tasks.controller.ts` - 30 issues
3. `src/controllers/posts.controller.ts` - 26 issues
4. `src/controllers/donations.controller.ts` - 24 issues
5. `src/auth/controllers/auth.controller.ts` - 21 issues
6. `src/services/user-hierarchy.service.ts` - 12 issues
7. `src/database/schema.sql` - 11 issues
8. `src/services/admin-tables.service.ts` - 11 issues
9. `src/database/database.module.ts` - 11 issues
10. `src/main.ts` - 11 issues

### Top 10 files with the most problems - Mobile

1. `screens/LandingSiteScreen.legacy.tsx` - 92 issues
2. `scripts/audit-all.ts` - 82 issues
3. `globals/responsive.ts` - 74 issues
4. `screens/Landing/styles/index.ts` - 51 issues
5. `components/FloatingBubblesSkia.tsx` - 48 issues
6. `bottomBarScreens/ProfileScreen.tsx` - 47 issues
7. `bottomBarScreens/HomeScreenOld.tsx` - 45 issues
8. `donationScreens/TrumpScreen.tsx` - 39 issues
9. `utils/enhancedDatabaseService.ts` - 34 issues
10. `donationScreens/MoneyScreen.tsx` - 33 issues

---

## 🔒 Security problems (VULNERABILITY)

2 open vulnerabilities across analyzed projects (see below).

- **typescript:S2068** (api) in file `src/database/database.module.ts` line 57
  - Message: Review this potentially hard-coded password.

- **tssecurity:S5145** (api) in file `src/minimal-server.ts` line 19
  - Message: Change this code to not log user-controlled data.

---

## 📈 Recommended solution strategy

### Step 1: Security problems (Vulnerabilities)
**Estimated time:** 1-2 hours
- [ ] Resolve open vulnerabilities
- [ ] Review security hotspots

### Step 2: CRITICAL Issues - Complexity (S3776)
**Estimated time:** 3-5 days
- [ ] Refactor highly complex functions (see Priority 1 lists)
- Approach: extract smaller functions and reduce branching

### Step 3: Type safety and other CRITICAL rules
**Estimated time:** 2-3 days
- [ ] Address remaining CRITICAL findings (SQL literals, pl/sql checks, etc.)

### Step 4: MAJOR Issues - in descending order of importance
**Estimated time:** 1-2 weeks
1. React hooks dependencies (S7778) - 79 issues
2. Template literals (S6582) - 87 issues
3. Ternary operators (S3358) - 289 issues

### Step 5: MINOR + INFO
**Estimated time:** 1 week
- [ ] Removing unused imports
- [ ] Removal of dead stores
- [ ] Treatment of TODO comments

### Step 6: Automation
- [ ] Align ESLint rules with SonarQube where practical
- [ ] Pre-commit hooks
- [ ] CI/CD integration (already on SonarCloud)

---

## 🎯 Goals

### short term (week 1-2)
- ✅ 0 BLOCKER issues (target)
- 🎯 0 CRITICAL issues
- 🎯 0 VULNERABILITY issues

### medium term (week 3-6)
- 🎯 <50 MAJOR issues (80% reduction from baseline)
- 🎯 <200 MINOR issues (50% reduction from baseline)

### Long term (month 2-3)
- 🎯 Quality Gate: PASSED
- 🎯 <10 MAJOR issues in total
- 🎯 Code coverage >70%
- 🎯 Full automation in CI/CD

---

## Useful links

- [SonarCloud - API Project](https://sonarcloud.io/dashboard?id=KarmaCummunity_KC-MVP-server)
- [SonarCloud - Mobile Project](https://sonarcloud.io/dashboard?id=KarmaCummunity_MVP)
- [SonarQube TypeScript Rules](https://rules.sonarsource.com/typescript/)

---

**Last update:** 2026-04-27T11:30:17.855Z
