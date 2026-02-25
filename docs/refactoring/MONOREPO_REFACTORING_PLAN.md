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

## Phase 1: ארגון Backend Modules (שבוע 1)

**מטרה:** העברת controllers ו-services למודולים לפי feature, בלי לשנות לוגיקה.

### 1.1 מבנה יעד

```
apps/api/src/
├── core/                    # תשתית (לא משנים כרגע)
│   └── (ריק - נשאר database/, redis/, auth/)
├── modules/
│   ├── auth/                # קיים - auth.controller, session.controller
│   ├── users/               # חדש - users.controller + ServicesModule
│   ├── donations/           # חדש
│   ├── rides/               # חדש
│   ├── posts/               # חדש
│   ├── items/               # קיים - מרחיב עם items-delivery
│   ├── stats/               # קיים - services/stats/
│   ├── admin/               # חדש - admin-tables, admin-files, crm, tasks, community-members
│   ├── challenges/          # חדש - challenges, community-group-challenges
│   ├── chat/                # חדש
│   ├── notifications/       # חדש
│   └── sync/                # חדש
├── shared/                  # controllers משותפים
│   ├── health/
│   ├── places/
│   └── rate-limit/
├── app.module.ts
└── main.ts
```

### 1.2 משימות Phase 1

| # | משימה | פרטים |
|---|-------|--------|
| 1 | **Auth Module** | העבר `auth.controller`, `session.controller` מ-controllers/ ל-auth/controllers/ |
| 2 | **Items Module** | העבר `ItemsDeliveryController` + `ItemsDeliveryService` מ-controllers/ ל-items/ |
| 3 | **Users Module** | צור modules/users/ – העבר UsersController + ServicesModule providers |
| 4 | **Stats Module** | העבר stats מ-services/stats/ ל-modules/stats/ (כולל StatsController) |
| 5 | **Admin Module** | צור modules/admin/ – העבר AdminTablesController, AdminFilesController, CrmController, TasksController, CommunityMembersController + AdminTablesService |
| 6 | **Donations, Rides, Posts** | צור מודול לכל אחד, העבר controller + service אם קיים |
| 7 | **Challenges Module** | צור modules/challenges/ – ChallengesController, CommunityGroupChallengesController |
| 8 | **Chat, Notifications, Sync** | צור מודול לכל אחד |
| 9 | **Shared** | health, places, rate-limit – אפשר להשאיר ב-shared/ או health/ |
| 10 | **AppModule** | עדכן imports – ייבא רק modules, לא controllers ישירות |

### 1.3 כללי העברה

- כל מודול מכיל: `*.module.ts`, `controllers/`, `services/`, `dto/` (אם רלוונטי)
- DTOs נשארים עם המודול שלהם
- עדכון imports ב-AppModule בלבד – המודולים מייצאים את ה-controllers שלהם

### 1.4 Checkpoint Phase 1

```bash
npm run build --workspace @kc/api
npm run test --workspace @kc/api
npm run lint --workspace @kc/api
# בדיקה ידנית: הרצת השרת ובדיקת endpoint אחד מכל מודול
```

---

## Phase 2: איחוד Mobile State (שבוע 2)

**מטרה:** הסרת כפילות UserContext + userStore, מעבר ל-Zustand בלבד.

### 2.1 מצב נוכחי

- `context/UserContext.tsx` – 628 שורות, React Context
- `stores/userStore.ts` – 774 שורות, Zustand
- ~72 קבצים מייבאים מ-userStore
- כפילות: User, AuthMode, Role מוגדרים בשניהם

### 2.2 משימות Phase 2

| # | משימה | פרטים |
|---|-------|--------|
| 1 | **בדיקת שימוש** | וידוא שכל השימושים ב-UserContext עוברים דרך userStore |
| 2 | **החלפת imports** | עדכון App.tsx – הסרת UserContext provider, שימוש ב-userStore בלבד |
| 3 | **מחיקת UserContext** | מחיקת context/UserContext.tsx |
| 4 | **ניקוי useUser** | החלפת useUser() ב-useUserStore() בכל הקבצים |

### 2.3 Checkpoint Phase 2

```bash
npm run build --workspace @kc/mobile
# בדיקה: התחברות, התנתקות, מעבר בין מסכים
```

---

## Phase 3: ארגון Mobile Utils (שבוע 3)

**מטרה:** העברת קבצים מ-utils/ למבנה ברור יותר, בלי לפצל קבצים גדולים.

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

## Phase 4: ניקוי ו-TODOs (שבוע 4)

### 4.1 משימות

| # | משימה | פרטים |
|---|-------|--------|
| 1 | **החלפת process.env** | (אופציונלי) הכנה ל-ConfigService – תיעוד ב-FUTURE_PLANS |
| 2 | **החלפת console.log** | (אופציונלי) שימוש ב-NestJS Logger – תיעוד ב-FUTURE_PLANS |
| 3 | **מחיקת קבצים מיותרים** | logger.ts vs loggerService.ts – איחוד אם אפשר |
| 4 | **עדכון README** | תיעוד המבנה החדש ב-docs/ |
| 5 | **בדיקות** | וידוא שכל הבדיקות הקיימות עוברות |

---

## טבלת מעקב

| Phase | סטטוס | תאריך |
|-------|--------|-------|
| Phase 1: Backend Modules | ✅ הושלם | 25/02/2026 |
| Phase 2: Mobile State | ✅ הושלם | 25/02/2026 |
| Phase 3: Mobile Utils | ⬜ לא התחיל | |
| Phase 4: ניקוי | ⬜ לא התחיל | |

---

## קישורים

- [תוכניות עתיד (FUTURE_PLANS.md)](./FUTURE_PLANS.md) – Prisma, shared packages, database.init
- [פיצול Users Controller](./USERS_CONTROLLER_SPLIT_PLAN.md) – תוכנית נפרדת לקובץ users.controller
