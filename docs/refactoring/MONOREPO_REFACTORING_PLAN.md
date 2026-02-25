# תוכנית רפקטור מונוריפו - גישה מדורגת

**תאריך:** 25/02/2026  
**עקרון מנחה:** ארגון מה שקיים, הוספת כלים בהדרגה. כל שלב מסתיים במצב יציב וניתן לפריסה.

---

## עקרונות

1. **אין Big Bang** – כל שלב עצמאי, ניתן לפריסה
2. **אין שינוי התנהגות** – רק העברת קבצים ועדכון imports
3. **בדיקות עוברות** – אחרי כל שלב: `npm run test`, `npm run lint`
4. **תוכניות עתיד** – מתועדות ב-[FUTURE_PLANS.md](./FUTURE_PLANS.md)

---

## ✅ Phase 1: ארגון Backend Modules – הושלם (25/02/2026)

כל המודולים הועברו ל-`apps/api/src/modules/` (auth, users, items, donations, rides, posts, stats, admin, challenges, chat, notifications, sync). AppModule מייבא רק modules.

## ✅ Phase 2: איחוד Mobile State – הושלם (25/02/2026)

`UserContext.tsx` נמחק. הכל עובד דרך `userStore.ts` (Zustand).

## ✅ Users Controller Split – הושלם (25/02/2026)

`users.controller.ts` פוצל ל-6 services: `user-auth.service.ts`, `user-profile.service.ts`, `user-hierarchy.service.ts`, `user-stats.service.ts`, `user-follow.service.ts`, `user-resolution.service.ts`. ה-controller עצמו קטן.

---

## ✅ Phase 3: ארגון Mobile Utils – הושלם (25/02/2026)

**מטרה:** העברת קבצים מ-`utils/` למבנה ברור יותר, בלי לשנות לוגיקה.

### 3.1 מבנה יעד

```
apps/mobile/
├── src/
│   ├── api/                 # apiService → כאן (ללא פיצול)
│   │   └── api.service.ts
│   ├── services/            # auth, posts, chat, stats, notification, follow
│   │   ├── auth.service.ts
│   │   ├── posts.service.ts
│   │   └── ...
│   ├── infrastructure/      # storage, database, config
│   │   ├── storage.service.ts
│   │   ├── database.service.ts
│   │   ├── config.ts
│   │   └── ...
│   ├── utils/               # רק פונקציות טהורות
│   │   ├── validation/
│   │   ├── formatters/
│   │   └── helpers/
│   ├── stores/
│   ├── components/
│   └── screens/
```

### 3.2 משימות Phase 3

| # | משימה | מ | ל |
|---|-------|---|--|
| 1 | apiService | utils/apiService.ts | src/api/api.service.ts |
| 2 | authService | utils/authService.ts | src/services/auth.service.ts |
| 3 | postsService | utils/postsService.ts | src/services/posts.service.ts |
| 4 | chatService | utils/chatService.ts | src/services/chat.service.ts |
| 5 | statsService | utils/statsService.ts | src/services/stats.service.ts |
| 6 | notificationService | utils/notificationService.ts | src/services/notification.service.ts |
| 7 | followService | utils/followService.ts | src/services/follow.service.ts |
| 8 | storageService | utils/storageService.ts | src/infrastructure/storage.service.ts |
| 9 | databaseService | utils/databaseService.ts | src/infrastructure/database.service.ts |
| 10 | config.constants | utils/config.constants.ts | src/infrastructure/config.ts |
| 11 | urlValidator | utils/urlValidator.ts | src/utils/validation/url-validator.ts |
| 12 | profileUtils, itemCategoryUtils | utils/ | src/utils/helpers/ |

**הערה:** עדכון imports בכל הקבצים שמייבאים מהקבצים האלה.

### 3.3 Checkpoint Phase 3

```bash
npm run build --workspace @kc/mobile
# בדיקה: זרימות עיקריות באפליקציה
```

---

## ✅ Phase 4: ניקוי ו-TODOs – הושלם (25/02/2026)

### 4.1 משימות

| # | משימה | פרטים | סטטוס |
|---|-------|--------|--------|
| 1 | **מחיקת קבצים מיותרים** | logger.ts vs loggerService.ts – איחוד אם אפשר | ✅ הושלם – utils/logger.ts נמחק (כל ה-imports כבר מ-loggerService) |
| 2 | **מחיקת eslint dumps** | מחיקת eslint.json, eslint2.json, eslint3.json מ-apps/mobile | ⏭️ לא רלוונטי – הקבצים לא קיימים בפרויקט |
| 3 | **עדכון README** | תיעוד המבנה החדש ב-docs/ | ✅ הושלם |
| 4 | **בדיקות** | וידוא שכל הבדיקות הקיימות עוברות | ✅ lint עובר; test עובר ב-@kc/api ו-@kc/mobile (@kc/dev-bot ללא test script) |
| 5 | **החלפת process.env** | (אופציונלי) הכנה ל-ConfigService – תיעוד ב-FUTURE_PLANS | נדחה |
| 6 | **החלפת console.log** | (אופציונלי) שימוש ב-NestJS Logger – תיעוד ב-FUTURE_PLANS | נדחה |

### 4.2 מבנה Mobile לאחר Phase 3 (תיעוד)

- **Logger:** שימוש ב-`utils/loggerService` בלבד (מאחסן ל-AsyncStorage, רמות log, export).
- **API/Services/Infrastructure:** תחת `apps/mobile/src/` – ראה §3.1.

---

## טבלת מעקב

| Phase | סטטוס | תאריך |
|-------|--------|-------|
| Phase 1: Backend Modules | ✅ הושלם | 25/02/2026 |
| Phase 2: Mobile State | ✅ הושלם | 25/02/2026 |
| Users Controller Split | ✅ הושלם | 25/02/2026 |
| Phase 3: Mobile Utils | ✅ הושלם | 25/02/2026 |
| Phase 4: ניקוי | ✅ הושלם | 25/02/2026 |

---

## קישורים

- [תוכניות עתיד (FUTURE_PLANS.md)](./FUTURE_PLANS.md) – Prisma, shared packages, database.init
