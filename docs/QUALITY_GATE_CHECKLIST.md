# Quality Gate - Checklist התקנה ✅

הדפס דף זה ועבור על כל הסעיפים בזה אחר זה.

---

## 📋 Pre-Installation

- [ ] Node.js 18+ מותקן
- [ ] Git מותקן
- [ ] גישה ל-GitHub Repository
- [ ] גישה ל-SonarCloud
- [ ] Snyk CLI מותקן (אופציונלי): `npm install -g snyk`

---

## 🔧 שלב 1: התקנת Git Hooks (מקומי)

```bash
cd apps/api
```

- [ ] הרצת Husky install:
  ```bash
  npx husky install
  ```

- [ ] הפיכת סקריפטים ל-executable:
  ```bash
  chmod +x scripts/check-quality-gate.sh
  chmod +x scripts/check-snyk-delta.sh
  chmod +x .husky/pre-commit
  chmod +x .husky/pre-push
  ```

- [ ] בדיקה ש-hooks קיימים:
  ```bash
  ls -la .husky/
  # צריך לראות: pre-commit, pre-push
  ```

**✅ אימות:**
```bash
# נסה commit עם שינוי קטן
echo "// test" >> src/main.ts
git add src/main.ts
git commit -m "test: hooks"
# צריך לראות הרצה של pre-commit hook
git reset HEAD~1
git checkout src/main.ts
```

---

## 🔑 שלב 2: הגדרת Secrets ב-GitHub

### 2.1: קבלת SONAR_TOKEN

- [ ] לך ל: https://sonarcloud.io/account/security
- [ ] לחץ על "Generate Token"
- [ ] שם: `github-actions-kc-api`
- [ ] Type: `Project Analysis Token` או `User Token`
- [ ] **העתק את ה-Token** (לא תוכל לראות אותו שוב!)
- [ ] שמור זמנית בקובץ text מאובטח

### 2.2: קבלת SNYK_TOKEN (אופציונלי)

- [ ] לך ל: https://app.snyk.io/account
- [ ] תחת "Auth Token", לחץ "Click to show"
- [ ] **העתק את ה-Token**
- [ ] שמור זמנית בקובץ text מאובטח

### 2.3: הוספת Secrets ל-GitHub

- [ ] לך ל-GitHub Repository
- [ ] Settings → Secrets and variables → Actions
- [ ] לחץ "New repository secret"

#### הוסף SONAR_TOKEN:
- [ ] Name: `SONAR_TOKEN`
- [ ] Secret: `<paste-token-here>`
- [ ] לחץ "Add secret"

#### הוסף SNYK_TOKEN (אופציונלי):
- [ ] Name: `SNYK_TOKEN`
- [ ] Secret: `<paste-token-here>`
- [ ] לחץ "Add secret"

- [ ] **מחק את קובץ ה-text הזמני עם ה-tokens!**

**✅ אימות:**
- [ ] Settings → Secrets and variables → Actions
- [ ] צריך לראות:
  - `GITHUB_TOKEN` (קיים אוטומטית)
  - `SONAR_TOKEN` ✅
  - `SNYK_TOKEN` ✅ (אם הוספת)

---

## 📊 שלב 3: הגדרת SonarCloud Quality Gate

### 3.1: התחברות ל-SonarCloud

- [ ] לך ל: https://sonarcloud.io
- [ ] התחבר עם GitHub
- [ ] מצא את הפרויקט: `KarmaCummunity_KC-MVP-server`

### 3.2: הגדרת Quality Gate

- [ ] לך ל: https://sonarcloud.io/organizations/karmacummunity/quality_gates
- [ ] בחר Quality Gate קיים או צור חדש
- [ ] לחץ "Set as Default" או הקצה לפרויקט

### 3.3: הגדרת Conditions (על New Code)

**Conditions נדרשים:**

- [ ] **New Bugs:**
  - Operator: `is greater than`
  - Value: `0`

- [ ] **New Vulnerabilities:**
  - Where: `on New Code`
  - Severity: `High, Critical`
  - Operator: `is greater than`
  - Value: `0`

- [ ] **New Security Hotspots Reviewed:**
  - Operator: `is less than`
  - Value: `100%`

- [ ] **Coverage on New Code:**
  - Operator: `is less than`
  - Value: `80%` (או לפי הסטנדרט שלכם)

- [ ] **Duplicated Lines on New Code:**
  - Operator: `is greater than`
  - Value: `3%`

- [ ] שמור את ה-Quality Gate

### 3.4: הקצאה לפרויקט

- [ ] לך לפרויקט: https://sonarcloud.io/project/overview?id=KarmaCummunity_KC-MVP-server
- [ ] Project Settings → Quality Gate
- [ ] בחר את ה-Quality Gate שיצרת
- [ ] שמור

**✅ אימות:**
- [ ] Project Overview → Quality Gate
- [ ] צריך לראות את ה-Quality Gate שהגדרת

---

## 🛡️ שלב 4: הגדרת Branch Protection ב-GitHub

### 4.1: יצירת Protection Rule

- [ ] Repository → Settings → Branches
- [ ] לחץ "Add rule"

### 4.2: הגדרות ה-Rule

**Branch name pattern:**
- [ ] `main`

**Protect matching branches:**
- [ ] ✅ Require status checks to pass before merging
  - [ ] ✅ Require branches to be up to date before merging
  
**Status checks שצריכים לעבור:**
- [ ] ✅ `Quality Gate Check`
- [ ] ✅ `SonarCloud`
- [ ] ✅ `quality-gate-summary`

**אפשרויות נוספות (מומלץ):**
- [ ] ✅ Require a pull request before merging
  - [ ] Required approvals: `1`
- [ ] ✅ Dismiss stale pull request approvals when new commits are pushed
- [ ] ✅ Include administrators (מומלץ מאוד!)

### 4.3: שמירה

- [ ] לחץ "Create" או "Save changes"

**✅ אימות:**
- [ ] Settings → Branches
- [ ] צריך לראות rule עבור `main` ✅

---

## 🧪 שלב 5: בדיקה מקומית

### 5.1: בדיקת Quality Gate Script

```bash
cd apps/api
./scripts/check-quality-gate.sh
```

**תוצאה צפויה:**
- [ ] "Detecting Changed Files" ✅
- [ ] "Running ESLint" ✅
- [ ] "Checking TypeScript Compilation" ✅
- [ ] "Running Tests" ✅
- [ ] "Checking for Security Vulnerabilities" ✅
- [ ] **FINAL SUMMARY: Quality Gate PASSED** ✅

### 5.2: בדיקת Git Hooks

**Test Pre-Commit:**
```bash
echo "// test pre-commit" >> src/main.ts
git add src/main.ts
git commit -m "test: pre-commit hook"
```

- [ ] Hook רץ ✅
- [ ] ESLint check רץ ✅
- [ ] TypeScript check רץ ✅

```bash
# נקה
git reset HEAD~1
git checkout src/main.ts
```

**Test Pre-Push:**
```bash
git checkout -b test/quality-gate
echo "// test pre-push" >> src/main.ts
git add src/main.ts
git commit -m "test: pre-push hook"
git push origin test/quality-gate
```

- [ ] Pre-commit hook רץ ✅
- [ ] Pre-push hook רץ ✅
- [ ] Quality gate check רץ ✅
- [ ] Push הצליח ✅

```bash
# נקה
git checkout main
git branch -D test/quality-gate
git push origin --delete test/quality-gate
```

---

## 🔄 שלב 6: בדיקת CI/CD (GitHub Actions)

### 6.1: יצירת Test PR

```bash
git checkout -b test/ci-quality-gate
echo "// test CI/CD" >> src/controllers/health.controller.ts
git add .
git commit -m "test: CI/CD quality gate"
git push origin test/ci-quality-gate
```

### 6.2: יצירת Pull Request

- [ ] לך ל-GitHub
- [ ] לחץ "Compare & pull request"
- [ ] צור PR: `test/ci-quality-gate` → `main`

### 6.3: בדיקת Actions

- [ ] Actions tab → צריך לראות workflows רצים:
  - [ ] `Quality Gate Check` ✅
  - [ ] `PR Quality Check` ✅
  - [ ] `SonarCloud` ✅

- [ ] חכה שכל ה-checks יסתיימו (1-3 דקות)

### 6.4: בדיקת תוצאות

**ב-PR:**
- [ ] Status checks עברו ✅
- [ ] תגובה אוטומטית נוספה ל-PR ✅
- [ ] SonarCloud badge/comment ✅

**אם יש שגיאות:**
- [ ] לחץ "Details" ליד השגיאה
- [ ] קרא את הלוגים
- [ ] תקן את הבעיות
- [ ] Push שוב (Actions ירוץ אוטומטית)

### 6.5: ניסיון Merge

- [ ] נסה לעשות merge (צריך להיות חסום אם checks נכשלו)
- [ ] אם כל ה-checks עברו - צריך לאפשר merge ✅

### 6.6: ניקוי

```bash
# סגור את ה-PR ב-GitHub (ללא merge)
# מחק את ה-branch
git checkout main
git branch -D test/ci-quality-gate
git push origin --delete test/ci-quality-gate
```

**✅ אימות:**
- [ ] PR נסגר ✅
- [ ] Branch נמחק ✅

---

## 📖 שלב 7: תיעוד והדרכת צוות

### 7.1: קריאת התיעוד

- [ ] קרא: `QUALITY_GATE_SETUP.md`
- [ ] קרא: `docs/QUALITY_GATE.md`
- [ ] הבן: `docs/QUALITY_GATE_ARCHITECTURE.md`

### 7.2: שיתוף עם הצוות

- [ ] שלח לצוות:
  - קישור ל-`QUALITY_GATE_SETUP.md`
  - הסבר על העקרונות (בעיות ישנות vs חדשות)
  - איך לתקן שגיאות נפוצות

- [ ] צור Slack/Teams message עם:
  ```
  🎉 Quality Gate מותקן!
  
  מעכשיו קוד חדש עובר בדיקות quality אוטומטיות.
  
  📖 קרא: QUALITY_GATE_SETUP.md
  🔧 בדיקה מקומית: npm run quality:gate
  ❓ שאלות? ראה docs/QUALITY_GATE.md
  ```

---

## ✅ Checklist סופי

### Local Setup
- [ ] Git hooks מותקנים
- [ ] Hooks הם executable
- [ ] Pre-commit עובד
- [ ] Pre-push עובד
- [ ] `npm run quality:gate` עובד

### GitHub Secrets
- [ ] SONAR_TOKEN מוגדר
- [ ] SNYK_TOKEN מוגדר (אופציונלי)
- [ ] Secrets נבדקו

### SonarCloud
- [ ] Quality Gate מוגדר
- [ ] Conditions על New Code
- [ ] Quality Gate מוקצה לפרויקט

### Branch Protection
- [ ] Rule עבור `main`
- [ ] Require status checks
- [ ] Status checks נבחרו
- [ ] Include administrators

### CI/CD Testing
- [ ] Test PR נוצר
- [ ] Actions רצו בהצלחה
- [ ] Status checks עברו
- [ ] תגובה אוטומטית נוספה
- [ ] Merge חסום כשיש שגיאות

### Documentation & Team
- [ ] תיעוד נקרא
- [ ] צוות עודכן
- [ ] דוגמאות נבדקו

---

## 🎉 סיימת!

**הכל עובד? מעולה!**

מערכת ה-Quality Gate פעילה ומגינה על הקוד שלך מפני הוספת בעיות חדשות.

### מה הלאה?

1. **השתמש:** `npm run quality:gate` לפני כל push
2. **עקוב:** דוחות SonarCloud
3. **שפר:** תקן בעיות ישנות בהדרגה
4. **הדרך:** עזור לחברי צוות חדשים

---

## 📞 עזרה

נתקלת בבעיה? ראה:
- `docs/QUALITY_GATE.md` → פתרון תקלות
- GitHub Issues
- צוות הפיתוח

---

**תאריך התקנה:** _______________  
**מותקן על ידי:** _______________  
**הערות:** _______________________________________________

