# תוכנית תיעדוף פתרון בעיות SonarQube

**תאריך:** 25.2.2026
**סריקה מ-SonarCloud:** https://sonarcloud.io

---

## סיכום מצב

### סטטיסטיקה כללית

- **סה"כ בעיות:** 884
- **BLOCKER:** 0 ✅
- **CRITICAL:** 86 ⚠️
- **MAJOR:** 267
- **MINOR:** 433
- **INFO:** 98

### פילוח לפי פרויקט

#### apps/api (Backend)
- סה"כ: 384 בעיות
- CRITICAL: 53
- MAJOR: 55
- MINOR: 181
- INFO: 95

#### apps/mobile (React Native)
- סה"כ: 500 בעיות
- CRITICAL: 33
- MAJOR: 212
- MINOR: 252
- INFO: 3

### פילוח לפי סוג

- **CODE_SMELL:** 878 (99.3%)
- **BUG:** 5
- **VULNERABILITY:** 1 🔴
- **SECURITY_HOTSPOT:** 0

---

## 📋 עדיפות 1: CRITICAL Issues (86)

### Top Rules - API

#### typescript:S3776 - Cognitive Complexity - פונקציות מורכבות מדי
- **כמות:** 32 בעיות
- **קבצים מושפעים:**
  - `src/controllers/users.controller.ts` (6)
  - `src/controllers/posts.controller.ts` (6)
  - `src/controllers/tasks.controller.ts` (3)
  - `src/database/database.init.ts` (2)
  - `src/controllers/items-delivery.service.ts` (2)

#### plsql:S1192 - SQL: String literals duplication
- **כמות:** 18 בעיות
- **קבצים מושפעים:**
  - `src/database/schema.sql` (9)
  - `src/database/migration-unify-users.sql` (4)
  - `src/database/migration-likes-comments.sql` (2)
  - `src/database/seed-sample-challenges.sql` (1)
  - `src/database/migration-add-missing-columns.sql` (1)

#### plsql:LiteralsNonPrintableCharactersCheck - plsql:LiteralsNonPrintableCharactersCheck
- **כמות:** 3 בעיות
- **קבצים מושפעים:**
  - `src/database/schema.sql` (2)
  - `src/database/migration-fix-schema-sync.sql` (1)

### Top Rules - Mobile

#### typescript:S3776 - Cognitive Complexity - פונקציות מורכבות מדי
- **כמות:** 33 בעיות
- **קבצים מושפעים:**
  - `screens/AdminTasksScreen.tsx` (3)
  - `bottomBarScreens/ProfileScreen.tsx` (2)
  - `donationScreens/ItemsScreen.tsx` (2)
  - `donationScreens/TrumpScreen.tsx` (2)
  - `components/Feed/PostReelItem.tsx` (2)

---

## 📋 עדיפות 2: MAJOR Issues (267)

### Top 10 Rules עם הכי הרבה MAJOR issues

- **typescript:S3358**: 120 בעיות - Ternary operators - שימוש מיותר או מורכב
- **typescript:S6582**: 50 בעיות - Prefer template literals - להשתמש ב-template strings
- **typescript:S1854**: 29 בעיות - Dead stores - משתנים שלא בשימוש
- **typescript:S6590**: 15 בעיות - React props spreading
- **typescript:S2933**: 10 בעיות - Class fields - צריך readonly
- **typescript:S4165**: 6 בעיות - Empty array destructuring
- **shelldre:S7679**: 4 בעיות - shelldre:S7679
- **shelldre:S7682**: 4 בעיות - shelldre:S7682
- **typescript:S1788**: 3 בעיות - typescript:S1788
- **typescript:S107**: 3 בעיות - typescript:S107

---

## 📊 ניתוח לפי קבצים בעייתיים

### Top 10 קבצים עם הכי הרבה בעיות - API

1. `src/controllers/stats.controller.ts` - 91 בעיות
1. `src/controllers/users.controller.ts` - 46 בעיות
1. `src/controllers/tasks.controller.ts` - 28 בעיות
1. `src/controllers/posts.controller.ts` - 26 בעיות
1. `src/controllers/donations.controller.ts` - 23 בעיות
1. `src/controllers/auth.controller.ts` - 21 בעיות
1. `src/services/admin-tables.service.ts` - 12 בעיות
1. `src/main.ts` - 12 בעיות
1. `src/database/schema.sql` - 11 בעיות
1. `src/database/database.module.ts` - 10 בעיות

### Top 10 קבצים עם הכי הרבה בעיות - Mobile

1. `scripts/audit-all.ts` - 82 בעיות
1. `screens/Landing/styles/index.ts` - 51 בעיות
1. `screens/ChallengeDetailsScreen.tsx` - 19 בעיות
1. `screens/AdminTasksScreen.tsx` - 19 בעיות
1. `components/Feed/PostCard/RideOfferedCard.tsx` - 18 בעיות
1. `utils/storageService.ts` - 17 בעיות
1. `donationScreens/TrumpScreen.tsx` - 16 בעיות
1. `components/Feed/PostCard/RegularItemCard.tsx` - 16 בעיות
1. `donationScreens/ItemsScreen.tsx` - 13 בעיות
1. `components/Feed/PostCard/TaskAssignmentCard.tsx` - 11 בעיות

---

## 🔒 בעיות אבטחה (VULNERABILITY)

1 vulnerabilities ב-API

- **tssecurity:S5145** בקובץ `src/minimal-server.ts` שורה 15
  - Message: Change this code to not log user-controlled data.

---

## 📈 אסטרטגיית פתרון מומלצת

### שלב 1: בעיות אבטחה (Vulnerabilities)
**זמן משוער:** 1-2 שעות
- [ ] פתרון 1 vulnerability
- [ ] בדיקת security hotspots

### שלב 2: CRITICAL Issues - Complexity (S3776)
**זמן משוער:** 3-5 ימים
- [ ] רפקטורינג של 65 פונקציות מורכבות
- גישה: פירוק לפונקציות קטנות יותר, extraction methods

### שלב 3: CRITICAL Issues - Type Safety (S7773)
**זמן משוער:** 2-3 ימים
- [ ] הוספת type annotations ל-146 מקומות
- גישה: שימוש ב-TypeScript strict mode

### שלב 4: CRITICAL Issues - אחרים
**זמן משוער:** 2-3 ימים
- [ ] פתרון בעיות נוספות (assertions, async/await, וכו')

### שלב 5: MAJOR Issues - בסדר יורד של חשיבות
**זמן משוער:** 1-2 שבועות
1. React hooks dependencies (S7778) - 77 issues
2. Template literals (S6582) - 50 issues
3. Ternary operators (S3358) - 120 issues

### שלב 6: MINOR + INFO
**זמן משוער:** 1 שבוע
- [ ] הסרת unused imports (39 issues)
- [ ] הסרת dead stores (29 issues)
- [ ] טיפול ב-TODO comments (98 issues)

### שלב 7: אוטומציה
- [ ] הגדרת ESLint rules להתאמה ל-SonarQube
- [ ] הוספת pre-commit hooks
- [ ] CI/CD integration

---

## 🎯 יעדים

### טווח קצר (שבוע 1-2)
- ✅ 0 BLOCKER issues (כבר אין!)
- 🎯 0 CRITICAL issues
- 🎯 0 VULNERABILITY issues

### טווח בינוני (שבוע 3-6)
- 🎯 <50 MAJOR issues (ירידה של 80%)
- 🎯 <200 MINOR issues (ירידה של 50%)

### טווח ארוך (חודש 2-3)
- 🎯 Quality Gate: PASSED
- 🎯 <10 MAJOR issues סה"כ
- 🎯 Code coverage >70%
- 🎯 אוטומציה מלאה ב-CI/CD

---

## קישורים שימושיים

- [SonarCloud - API Project](https://sonarcloud.io/dashboard?id=KarmaCummunity_KC-MVP-server)
- [SonarCloud - Mobile Project](https://sonarcloud.io/dashboard?id=KarmaCummunity_MVP)
- [SonarQube TypeScript Rules](https://rules.sonarsource.com/typescript/)

---

**עדכון אחרון:** 2026-02-25T02:08:08.788Z
