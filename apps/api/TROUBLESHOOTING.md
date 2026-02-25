# מדריך פתרון בעיות - KC-MVP-Server

## 🔧 בעיות נפוצות ופתרונות

---

### 1. שגיאות TypeScript: "Property has no initializer"

**תסמינים:**
```
error TS2564: Property 'propertyName' has no initializer and is not definitely assigned in the constructor.
```

**פתרון:**
במקום להשתמש ב-`!` (Definite Assignment Assertion), השתמש באתחול מפורש:

❌ **לא נכון:**
```typescript
class MyDto {
  @IsString()
  name!: string;
}
```

✅ **נכון:**
```typescript
class MyDto {
  @IsString()
  name: string = '';
}
```

**מקרים נוספים:**
- `number` → `= 0`
- `boolean` → `= false`
- `array` → `= []`
- `object` → `= {}`

**הערה:** Properties אופציונליים עם `?` לא דורשים אתחול:
```typescript
@IsOptional()
@IsString()
name?: string;  // ✅ בסדר ככה
```

---

### 2. שגיאות Build ב-Railway/Docker

**תסמינים:**
- Build נכשל בשלב `npm run build`
- שגיאות TypeScript שלא מופיעות מקומית

**פתרון:**

1. **נקה קבצי build ישנים:**
```bash
rm -rf dist
rm -f *.tsbuildinfo
```

2. **בדוק קומפילציה מקומית:**
```bash
npx tsc --noEmit
```

3. **בדוק build מלא:**
```bash
npm run build
```

4. **אם הכל עובד מקומית אבל לא ב-Railway:**
   - וודא ש-`node_modules` לא נמצא ב-`.gitignore`
   - בדוק שה-`package-lock.json` מעודכן
   - וודא ש-`tsconfig.json` תקין

---

### 3. בעיות עם Redis Connection

**תסמינים:**
```
Error: Redis connection failed
ECONNREFUSED
```

**פתרון:**

1. **וודא ש-Redis רץ:**
```bash
# מקומי:
redis-cli ping
# אמור להחזיר: PONG

# Docker:
docker ps | grep redis
```

2. **בדוק את משתני הסביבה:**
```bash
echo $REDIS_URL
# אמור להיות: redis://localhost:6379 או URL מלא
```

3. **התחל Redis מקומי:**
```bash
# macOS:
brew services start redis

# Docker:
docker compose up -d redis
```

---

### 4. בעיות עם PostgreSQL Connection

**תסמינים:**
```
Error: Connection terminated unexpectedly
ECONNREFUSED ::1:5432
```

**פתרון:**

1. **וודא ש-Postgres רץ:**
```bash
# בדיקה:
psql -U kc -d kc_db -h localhost

# הפעלה (Docker):
docker compose up -d postgres
```

2. **בדוק משתני סביבה:**
```bash
echo $DATABASE_URL
# או:
echo $POSTGRES_HOST
echo $POSTGRES_USER
echo $POSTGRES_DB
```

3. **אתחל את מסד הנתונים:**
```bash
npm run init:db
```

---

### 5. שגיאות Authentication / Google OAuth

**תסמינים:**
- "Invalid token"
- "User not found"
- בעיות עם Google login

**פתרון:**

1. **וודא שמשתני סביבה מוגדרים:**
```bash
echo $EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
echo $GOOGLE_CLIENT_ID
```

2. **בדוק שהטוקנים תקפים:**
   - היכנס ל-Google Cloud Console
   - וודא ש-OAuth 2.0 Client ID פעיל
   - בדוק Authorized redirect URIs

3. **נקה Redis cache:**
```bash
redis-cli FLUSHALL
```

---

### 6. Port Already in Use

**תסמינים:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**פתרון:**

1. **מצא את התהליך:**
```bash
lsof -i :3000
```

2. **עצור את התהליך:**
```bash
kill -9 <PID>
```

3. **או שנה את הפורט:**
```bash
PORT=3001 npm run start
```

---

### 7. בעיות עם Migrations / Schema

**תסמינים:**
- טבלאות לא קיימות
- שדות חסרים
- Schema outdated

**פתרון:**

1. **אפס את מסד הנתונים (⚠️ מחק נתונים!):**
```bash
npm run reset:db:full
```

2. **רק schema חדש (שומר נתונים):**
```bash
npm run init:db
```

3. **בדוק שה-schema עדכני:**
```bash
psql -U kc -d kc_db -h localhost
\dt  # רשימת טבלאות
\d challenges  # מבנה טבלה ספציפית
```

---

### 8. שגיאות Validation

**תסמינים:**
```
BadRequestException: Validation failed
```

**פתרון:**

1. **בדוק את הלוגים:**
   - השרת מדפיס את שגיאות הוולידציה המדויקות

2. **וודא שהנתונים תואמים ל-DTO:**
```typescript
// דוגמה:
class CreateChallengeDto {
  @IsString()
  @Length(1, 50)
  name: string = '';  // חייב להיות string בין 1-50 תווים
  
  @IsNumber()
  @Min(1)
  customResetAmount: number = 0;  // חייב להיות מספר >= 1
}
```

3. **השתמש ב-Postman/Thunder Client:**
   - בדוק את ה-request body
   - וודא ש-Content-Type הוא `application/json`

---

### 9. שגיאות CORS

**תסמינים:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**פתרון:**

1. **וודא ש-CORS מוגדר ב-`main.ts`:**
```typescript
app.enableCors({
  origin: ['http://localhost:8081', 'https://your-domain.com'],
  credentials: true,
});
```

2. **הוסף את ה-origin של הלקוח:**
   - עדכן את רשימת ה-origins המורשים

---

### 10. Build מצליח אבל Server לא עולה

**תסמינים:**
- `npm run build` עובד
- `npm start` נכשל או קורס

**פתרון:**

1. **בדוק את הלוגים:**
```bash
npm start 2>&1 | tee server-output.log
```

2. **וודא שכל הקבצים נקלטו ל-dist:**
```bash
ls -R dist/
```

3. **בדוק שהתלויות מותקנות:**
```bash
npm ci
```

4. **בדוק משתני סביבה:**
```bash
# צריך להיות מוגדר לפחות:
DATABASE_URL=...
REDIS_URL=...
```

---

## 🚀 בדיקות מהירות לפני Deploy

### Checklist:

- [ ] `npm run build` עובד ללא שגיאות
- [ ] `npx tsc --noEmit` עובר ללא שגיאות
- [ ] `npm test` עובר (אם יש טסטים)
- [ ] משתני סביבה מוגדרים ב-Railway/Docker
- [ ] `.env` לא מועלה לגיט (רק `.env.example`)
- [ ] `package-lock.json` מעודכן וב-git
- [ ] גרסה עודכנה ב-`package.json`
- [ ] `CHANGELOG.md` עודכן

---

## 📞 עזרה נוספת

אם הבעיה נמשכת:

1. **בדוק את הלוגים המלאים**
2. **חפש בעיות דומות ב-GitHub Issues**
3. **שתף את הלוגים והקוד הרלוונטי**
4. **נסה build נקי:**
   ```bash
   rm -rf node_modules dist *.tsbuildinfo
   npm ci
   npm run build
   ```

---

**עודכן לאחרונה:** 23 נובמבר 2025  
**גרסה:** 1.7.6
