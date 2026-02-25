# איך להריץ סנכרון יוזרים בפרודקשן

## שלב 1: וודא שהקוד עלה לפרודקשן

הקוד כבר עלה ל-git (branch `dev`). עכשיו צריך:

1. **אם יש auto-deploy**: חכה שהשרת יעלה (2-5 דקות)
2. **אם אין auto-deploy**: צריך לעשות deploy ידני דרך Railway dashboard

## שלב 2: הרצת הסינכרון

### אפשרות א': דרך API Endpoint (הכי קל)

אחרי שהשרת עלה, הרץ:

```bash
curl -X POST "https://kc-mvp-server-production.up.railway.app/api/sync/all" \
  -H "Content-Type: application/json"
```

אם יש API key מוגדר, הוסף:
```bash
curl -X POST "https://kc-mvp-server-production.up.railway.app/api/sync/all" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY"
```

### אפשרות ב': דרך Railway CLI

```bash
cd KC-MVP-server
railway login
railway link
railway run npm run sync:firebase-users
```

### אפשרות ג': דרך Railway Dashboard

1. לך ל-Railway Dashboard
2. בחר את השרת
3. לך ל-"Deployments" → "New Deployment"
4. או לך ל-"Shell" והרץ:
   ```bash
   npm run sync:firebase-users
   ```

## שלב 3: בדיקה

לאחר הרצת הסינכרון, בדוק:

1. **דרך API:**
   ```bash
   curl "https://kc-mvp-server-production.up.railway.app/api/sync/status"
   ```
   
   אמור להראות:
   ```json
   {
     "success": true,
     "firebase_users": 20,
     "user_profiles_total": 20,
     "user_profiles_with_firebase_uid": 20,
     "missing_sync": 0
   }
   ```

2. **במסך "גלה אנשים":**
   - פתח את האפליקציה
   - לך למסך "גלה אנשים"
   - בדוק שהלוג מראה 20 יוזרים

## הערות חשובות

- ⚠️ **וודא שיש `FIREBASE_SERVICE_ACCOUNT_KEY` בפרודקשן** - בלי זה הסינכרון לא יעבוד
- ⚠️ הסינכרון יכול לקחת כמה דקות אם יש הרבה יוזרים
- ✅ אחרי הסינכרון, כל היוזרים יופיעו ב"גלה אנשים"


