# Quality Gate Setup - הוראות התקנה והגדרה

## 🎯 מטרה

מניעת הוספת בעיות חדשות לקוד ("עצירת הדימום").

**עקרון:** קוד עם בעיות ישנות = OK | קוד עם בעיות חדשות = BLOCKED

---

## 🚀 התקנה מהירה

### שלב 1: הפעלת Git Hooks (מקומי)

```bash
cd apps/api

# התקנת Husky hooks
npx husky install

# הפעלת הסקריפטים
chmod +x scripts/check-quality-gate.sh
chmod +x scripts/check-snyk-delta.sh
```

מעכשיו:
- ✅ `git commit` - ירוץ ESLint + TypeScript compilation
- ✅ `git push` - ירוץ בדיקת Quality Gate מלאה

---

### שלב 2: הגדרת Secrets ב-GitHub

עבור לתפריט Repository → Settings → Secrets and variables → Actions

הוסף:
```
SONAR_TOKEN       - Token מ-SonarCloud
SNYK_TOKEN        - Token מ-Snyk (אופציונלי)
```

#### קבלת SONAR_TOKEN:
1. לך ל: https://sonarcloud.io/account/security
2. צור token חדש (שם: `github-actions`)
3. העתק והוסף ל-GitHub Secrets

#### קבלת SNYK_TOKEN (אופציונלי):
1. לך ל: https://app.snyk.io/account
2. לחץ על "Click to show" תחת Auth Token
3. העתק והוסף ל-GitHub Secrets

---

### שלב 3: הגדרת SonarCloud Quality Gate

1. לך ל: https://sonarcloud.io/project/quality_gates?id=KarmaCummunity_KC-MVP-server

2. צור Quality Gate חדש או ערוך קיים:

**כללים להגדרה (New Code בלבד):**
```
✅ New Bugs = 0
✅ New Vulnerabilities = 0 (High/Critical)
✅ New Security Hotspots Reviewed = 100%
✅ New Code Coverage >= 80%
✅ Duplicated Lines on New Code < 3%
```

3. שמור והקצה לפרויקט

---

### שלב 4: הגדרת Branch Protection

עבור ל: Repository → Settings → Branches → Add rule

**Branch name pattern:** `main`

✅ Require status checks to pass before merging
  - Quality Gate Check
  - SonarCloud
  - quality-gate-summary

✅ Require branches to be up to date before merging

✅ Include administrators (מומלץ)

---

## 🧪 בדיקה שהכל עובד

### בדיקה מקומית:

```bash
cd apps/api

# בדיקה מהירה
./scripts/check-quality-gate.sh

# צפי לפלט:
# ╔════════════════════════════════════════════╗
# ║           Quality Gate Check               ║
# ╚════════════════════════════════════════════╝
# ...
# ✅ Quality Gate PASSED
```

### בדיקת Git Hooks:

```bash
# עשה שינוי קטן
echo "// test" >> src/main.ts

# Stage
git add src/main.ts

# נסה commit (pre-commit hook צריך לרוץ)
git commit -m "test: quality gate"

# אם יש שגיאות - הcommit ייחסם ✅
# אם הכל תקין - הcommit יעבור ✅

# בטל את השינוי
git reset HEAD~1
git checkout src/main.ts
```

### בדיקת CI/CD:

1. צור branch חדש:
```bash
git checkout -b test/quality-gate
```

2. עשה שינוי קטן:
```bash
echo "// test" >> src/main.ts
git add src/main.ts
git commit -m "test: quality gate CI"
git push origin test/quality-gate
```

3. צור Pull Request

4. בדוק שה-GitHub Actions רצות:
   - ✅ Quality Gate Check
   - ✅ SonarCloud Scan

5. מחק את ה-branch אחרי הבדיקה

---

## 📊 מה נבדק?

### Pre-Commit (מקומי):
- ESLint על קבצים staged
- TypeScript compilation

### Pre-Push (מקומי):
- כל מה שב-Pre-Commit
- Tests + Coverage
- Snyk Security (אם מותקן)
- Sensitive data scan

### CI/CD (GitHub Actions):
- ESLint על קבצים שהשתנו
- Snyk Security (High/Critical)
- SonarCloud Quality Gate
- Tests + Coverage

---

## 🔧 שימוש יומיומי

### תהליך עבודה רגיל:

```bash
# 1. עשית שינויים
vim src/controllers/users.controller.ts

# 2. Stage
git add src/controllers/users.controller.ts

# 3. Commit (pre-commit רץ אוטומטית)
git commit -m "fix: update user validation"

# 4. Push (pre-push רץ אוטומטית)
git push origin feature/my-branch

# 5. צור PR - GitHub Actions רצות אוטומטית
```

### אם יש שגיאות:

```bash
# ESLint errors
npm run lint -- --fix

# Test failures
npm test

# Compilation errors
npm run build

# אז commit שוב
git add .
git commit -m "fix: resolve quality issues"
git push
```

---

## ⚠️ פתרון בעיות נפוצות

### "ESLint found issues"
```bash
npm run lint -- --fix
```

### "Tests failed"
```bash
npm test -- --watch
# תקן את הטסטים ונסה שוב
```

### "Snyk found high vulnerabilities"
```bash
snyk wizard
# או
npm update <package-name>
```

### "SonarCloud Quality Gate failed"
1. לך לדוח SonarCloud
2. סנן ל-"New Code"
3. תקן את הבעיות
4. Push שוב

### דילוג על Hooks (חירום בלבד!)
```bash
git commit --no-verify
git push --no-verify
```

**⚠️ זה לא ידלג על CI/CD checks!**

---

## 📚 תיעוד מלא

לקריאה מעמיקה: [docs/QUALITY_GATE.md](./docs/QUALITY_GATE.md)

---

## ✅ Checklist התקנה

- [ ] Git hooks מותקנים ופעילים
- [ ] SONAR_TOKEN מוגדר ב-GitHub Secrets
- [ ] SNYK_TOKEN מוגדר ב-GitHub Secrets (אופציונלי)
- [ ] SonarCloud Quality Gate מוגדר
- [ ] Branch Protection מופעל על `main`
- [ ] בדיקה מקומית עברה בהצלחה
- [ ] בדיקת PR עברה בהצלחה

---

## 🎉 סיימת!

מערכת ה-Quality Gate פעילה ומגינה על הקוד שלך מפני הוספת בעיות חדשות.

**זכור:**
- בעיות ישנות = OK (technical debt)
- בעיות חדשות = BLOCKED ❌

זה מאפשר לכם לעבוד על תיקון החוב הטכני הקיים בלי להוסיף בעיות חדשות.
