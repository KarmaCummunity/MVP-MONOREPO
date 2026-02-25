# מבנה קבצי Environment – KC Monorepo

תיעוד ארגון קבצי `.env` בהתאם לארכיטקטורה החדשה.

## עקרון

- **`.env.example`** – תבנית (ללא סודות), נשמרת ב-git
- **`.env`**, **`.env.development`**, **`.env.production`** – ערכים אמיתיים, **לא** נשמרים ב-git

---

## מבנה לפי App

| App | קובץ | תיאור |
|-----|------|--------|
| **@kc/api** | `apps/api/.env.example` | תבנית – העתק ל-`.env` |
| | `apps/api/.env` | ערכים מקומיים (gitignore) |
| | `apps/api/.env.test.example` | תבנית לבדיקות – העתק ל-`.env.test` |
| **@kc/mobile** | `apps/mobile/.env.example` | תבנית – העתק ל-`.env` |
| | `apps/mobile/.env` | ערכים מקומיים (gitignore) |
| **@kc/dev-bot** | `apps/dev-bot/.env.example` | תבנית – העתק ל-`.env` |
| | `apps/dev-bot/.env` | ערכים מקומיים (gitignore) |

---

## @kc/api – משתנים עיקריים

| משתנה | חובה | תיאור |
|-------|------|--------|
| `DATABASE_URL` | ✓ | `postgresql://kc:PASSWORD@localhost:5435/kc_db` |
| `POSTGRES_PASSWORD` | אופציונלי | ל-E2E מקומי: אם ריק, משתמש ב-`change_me_in_env` |
| `JWT_SECRET` | ✓ | מינימום 32 תווים |
| `REDIS_URL` | ✓ | `redis://localhost:6379` |
| `GOOGLE_CLIENT_ID` | ✓ | Google OAuth |
| `ROOT_ADMIN_EMAIL` | ✓ | אימייל אדמין ראשי |

**התחלה מהירה:**
```bash
cd apps/api
cp .env.example .env
# ערוך .env עם הערכים האמיתיים
```

---

## @kc/mobile – משתנים עיקריים

| משתנה | תיאור |
|-------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:3001` לפיתוח מקומי |
| `EXPO_PUBLIC_*` | Firebase, Google OAuth – מ-Firebase Console / Google Cloud |

**E2E מקומי:** `run-local-e2e.sh` מגדיר אוטומטית `EXPO_PUBLIC_API_BASE_URL`.

---

## @kc/dev-bot

| משתנה | תיאור |
|-------|--------|
| `TELEGRAM_TOKEN` | מ-BotFather |
| `GEMINI_API_KEY` | Google AI Studio |

---

## קבצים נוספים (gitignore)

- `.env.development` – ערכי dev (לא ב-git)
- `.env.production` – ערכי prod (לא ב-git)
- `.env` – ערכים מקומיים (לא ב-git)

---

## קישורים

- [DEVELOPMENT_SETUP.md](../DEVELOPMENT_SETUP.md) – התקנת סביבת פיתוח
- [MONOREPO_REFACTORING_PLAN.md](./MONOREPO_REFACTORING_PLAN.md) – תוכנית הרפקטור
