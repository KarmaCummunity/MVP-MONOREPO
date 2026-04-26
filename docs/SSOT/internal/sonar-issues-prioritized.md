# SonarQube troubleshooting priority plan

**Date:** 25.2.2026
**Scan from SonarCloud:** https://sonarcloud.io

---

## Status summary

### General statistics

- **Total problems:** 884
- **BLOCKER:** 0 ✅
- **CRITICAL:** 86 ⚠️
- **MAJOR:** 267
- **MINOR:** 433
- **INFO:** 98

### Segmentation by project

#### apps/api (Backend)
- Total: 384 problems
- CRITICAL: 53
- MAJOR: 55
- MINOR: 181
- INFO: 95

#### apps/mobile (React Native)
- Total: 500 problems
- CRITICAL: 33
- MAJOR: 212
- MINOR: 252
- INFO: 3

### Segmentation by type

- **CODE_SMELL:** 878 (99.3%)
- **BUG:** 5
- **VULNERABILITY:** 1 🔴
- **SECURITY_HOTSPOT:** 0

---

## 📋 Priority 1: CRITICAL Issues (86)

### Top Rules - API

#### typescript:S3776 - Cognitive Complexity - functions are too complex
- **Quantity:** 32 problems
- **Affected files:**
  - `src/controllers/users.controller.ts` (6)
  - `src/controllers/posts.controller.ts` (6)
  - `src/controllers/tasks.controller.ts` (3)
  - `src/database/database.init.ts` (2)
  - `src/controllers/items-delivery.service.ts` (2)

#### plsql:S1192 - SQL: String literals duplication
- **Quantity:** 18 problems
- **Affected files:**
  - `src/database/schema.sql` (9)
  - `src/database/migration-unify-users.sql` (4)
  - `src/database/migration-likes-comments.sql` (2)
  - `src/database/seed-sample-challenges.sql` (1)
  - `src/database/migration-add-missing-columns.sql` (1)

#### plsql:LiteralsNonPrintableCharactersCheck - plsql:LiteralsNonPrintableCharactersCheck
- **Quantity:** 3 problems
- **Affected files:**
  - `src/database/schema.sql` (2)
  - `src/database/migration-fix-schema-sync.sql` (1)

### Top Rules - Mobile

#### typescript:S3776 - Cognitive Complexity - functions are too complex
- **Quantity:** 33 problems
- **Affected files:**
  - `screens/AdminTasksScreen.tsx` (3)
  - `bottomBarScreens/ProfileScreen.tsx` (2)
  - `donationScreens/ItemsScreen.tsx` (2)
  - `donationScreens/TrumpScreen.tsx` (2)
  - `components/Feed/PostReelItem.tsx` (2)

---

## 📋 Priority 2: MAJOR Issues (267)

### Top 10 Rules with the most MAJOR issues

- **typescript:S3358**: 120 problems - Ternary operators - redundant or complex use
- **typescript:S6582**: 50 problems - Prefer template literals - use template strings
- **typescript:S1854**: 29 problems - Dead stores - unused variables
- **typescript:S6590**: 15 problems - React props spreading
- **typescript:S2933**: 10 problems - Class fields - need readonly
- **typescript:S4165**: 6 problems - Empty array destructuring
- **shelldre:S7679**: 4 issues - shelldre:S7679
- **shelldre:S7682**: 4 problems - shelldre:S7682
- **typescript:S1788**: 3 issues - typescript:S1788
- **typescript:S107**: 3 problems - typescript:S107

---

## 📊 Analysis by problematic files

### Top 10 files with the most problems - API

1. `src/controllers/stats.controller.ts` - 91 issues
1. `src/controllers/users.controller.ts` - 46 issues
1. `src/controllers/tasks.controller.ts` - 28 issues
1. `src/controllers/posts.controller.ts` - 26 issues
1. `src/controllers/donations.controller.ts` - 23 issues
1. `src/controllers/auth.controller.ts` - 21 issues
1. `src/services/admin-tables.service.ts` - 12 problems
1. `src/main.ts` - 12 problems
1. `src/database/schema.sql` - 11 problems
1. `src/database/database.module.ts` - 10 problems

### Top 10 files with the most problems - Mobile

1. `scripts/audit-all.ts` - 82 issues
1. `screens/Landing/styles/index.ts` - 51 problems
1. `screens/ChallengeDetailsScreen.tsx` - 19 issues
1. `screens/AdminTasksScreen.tsx` - 19 issues
1. `components/Feed/PostCard/RideOfferedCard.tsx` - 18 issues
1. `utils/storageService.ts` - 17 issues
1. `donationScreens/TrumpScreen.tsx` - 16 issues
1. `components/Feed/PostCard/RegularItemCard.tsx` - 16 issues
1. `donationScreens/ItemsScreen.tsx` - 13 issues
1. `components/Feed/PostCard/TaskAssignmentCard.tsx` - 11 problems

---

## 🔒 Security problems (VULNERABILITY)

1 vulnerabilities in the API

- **tssecurity:S5145** in file `src/minimal-server.ts` line 15
  - Message: Change this code to not log user-controlled data.

---

## 📈 Recommended solution strategy

### Step 1: Security problems (Vulnerabilities)
**Estimated time:** 1-2 hours
- [ ] Solution 1 vulnerability
- [ ] Checking security hotspotsType Safety (S7773)
**Estimated time:** 2-3 days
- [ ] Added type annotations to 146 places
- Access: using TypeScript strict mode

### Step 4: CRITICAL Issues - Others
**Estimated time:** 2-3 days
- [ ] Solving additional problems (assertions, async/await, etc.)

### Step 5: MAJOR Issues - in descending order of importance
**Estimated time:** 1-2 weeks
1. React hooks dependencies (S7778) - 77 issues
2. Template literals (S6582) - 50 issues
3. Ternary operators (S3358) - 120 issues

### Step 6: MINOR + INFO
**Estimated time:** 1 week
- [ ] Removing unused imports (39 issues)
- [ ] Removal of dead stores (29 issues)
- [ ] Treatment of TODO comments (98 issues)

### Step 7: Automation
- [ ] Setting ESLint rules to match SonarQube
- [ ] Added pre-commit hooks
- [ ] CI/CD integration

---

## 🎯 Goals

### short term (week 1-2)
- ✅ 0 BLOCKER issues (no more!)
- 🎯 0 CRITICAL issues
- 🎯 0 VULNERABILITY issues

### medium term (week 3-6)
- 🎯 <50 MAJOR issues (80% reduction)
- 🎯 <200 MINOR issues (50% reduction)

### Long term (month 2-3)
- 🎯 Quality Gate: PASSED
- 🎯 <10 MAJOR issues in total
- 🎯 Code coverage >70%
- 🎯 Full automation in CI/CD

---

## Useful links

- [SonarCloud - API Project](https://sonarcloud.io/dashboard?id=KarmaCommunity_KC-MVP-server)
- [SonarCloud - Mobile Project](https://sonarcloud.io/dashboard?id=KarmaCommunity_MVP)
- [SonarQube TypeScript Rules](https://rules.sonarsource.com/typescript/)

---

**Last update:** 2026-02-25T02:08:08.788Z