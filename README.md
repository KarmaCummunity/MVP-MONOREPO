# kc-monorepo

מונורפו שמרכז את כל פרויקטי KC:

- `apps/api` – שרת ה-NestJS (לשעבר `KC-MVP-server`)
- `apps/mobile` – אפליקציית ה-Expo/React Native (לשעבר `MVP`)
- `apps/dev-bot` – בוט/CLI (לשעבר `dev-bot`)
- `docs` – תיעוד ומסמכים

## התקנה

```bash
cd kc-monorepo
npm install
```

## הרצה

- שרת API (development):

```bash
npm run dev:api
```

- מובייל (Expo):

```bash
npm run dev:mobile
```

- בוט:

```bash
npm run dev:bot
```

## מבנה תיקיות

```text
kc-monorepo/
  apps/
    api/        # KC-MVP-server
    mobile/     # MVP
    dev-bot/    # dev-bot
  packages/     # קוד וקונפיגורציות משותפים (לעתיד)
  docs/         # תיעוד
```
