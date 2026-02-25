# Quality Gate - מניעת הוספת בעיות חדשות

## 📋 תוכן עניינים

- [סקירה כללית](#סקירה-כללית)
- [איך זה עובד?](#איך-זה-עובד)
- [בדיקות שמתבצעות](#בדיקות-שמתבצעות)
- [שימוש מקומי](#שימוש-מקומי)
- [הגדרת CI/CD](#הגדרת-cicd)
- [פתרון תקלות](#פתרון-תקלות)

---

## 🎯 סקירה כללית

מערכת ה-Quality Gate נועדה **לעצור את ה"דימום"** - למנוע הוספת בעיות חדשות לקוד.

### עקרונות מרכזיים:

1. **✅ בעיות ישנות = OK** - קוד עם בעיות קיימות יכול להיות ממוזג
2. **❌ בעיות חדשות = BLOCKED** - קוד עם בעיות חדשות **לא יכול** להיות ממוזג
3. **🎯 התמקדות ב-New Code** - כל הבדיקות מתמקדות רק בקוד שהשתנה

### מה נבדק?

- 🔍 **ESLint** - שגיאות linting בקבצים שהשתנו בלבד
- 🔒 **Snyk** - פגיעויות אבטחה חדשות (High/Critical)
- 📊 **SonarCloud** - בעיות איכות קוד חדשות
- ✅ **Tests** - כל הטסטים חייבים לעבור

---

## 🔄 איך זה עובד?

### שכבות הגנה:

```
┌─────────────────────────────────────────────┐
│  1. Pre-Commit Hook                         │
│     ✓ ESLint על קבצים staged בלבד          │
│     ✓ TypeScript compilation                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  2. Pre-Push Hook                           │
│     ✓ בדיקה מקומית מלאה                     │
│     ✓ מזהה בעיות לפני שהן מגיעות ל-CI       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  3. CI/CD Quality Gate (GitHub Actions)     │
│     ✓ ESLint על קבצים שהשתנו                │
│     ✓ Snyk Security (High/Critical)         │
│     ✓ SonarCloud Quality Gate               │
│     ✓ Tests + Coverage                      │
└─────────────────────────────────────────────┘
                    ↓
        ✅ Merge מאושר / ❌ Merge חסום
```

---

## 🔍 בדיקות שמתבצעות

### 1. ESLint - בדיקת Linting

**מה נבדק:**
- קבצים TypeScript שהשתנו בלבד (לא כל הפרויקט)
- שגיאות linting חדשות

**דוגמה:**
```bash
# בדיקה מקומית
npm run lint

# תיקון אוטומטי
npm run lint -- --fix
```

**קריטריון להצלחה:**
- אין שגיאות ESLint בקבצים שהשתנו
- warnings מותרים (לא חוסמים merge)

---

### 2. Snyk Security - בדיקת אבטחה

**מה נבדק:**
- פגיעויות אבטחה ברמת **High** ו-**Critical** בלבד
- רק פגיעויות **חדשות** שאפשר לתקן (upgradable)

**דוגמה:**
```bash
# בדיקה מקומית
./scripts/check-snyk-delta.sh

# בדיקה מלאה
snyk test --severity-threshold=high
```

**קריטריון להצלחה:**
- אין פגיעויות חדשות ברמת High/Critical
- פגיעויות ישנות לא חוסמות (technical debt)

**הגדרות Snyk:**
- קובץ `.snyk` מכיל exclusions לבעיות false-positive
- `--fail-on=upgradable` - כשל רק על בעיות שניתן לתקן

---

### 3. SonarCloud - איכות קוד

**מה נבדק:**
- Bugs חדשים
- Code Smells חדשים
- Security Hotspots חדשים
- Coverage על קוד חדש בלבד

**הגדרות:**
```properties
# sonar-project.properties
sonar.qualitygate.wait=true
sonar.newCode.referenceBranch=main
```

**Quality Gate Rules (SonarCloud Dashboard):**

להגדרה ב-SonarCloud:
1. לך ל: https://sonarcloud.io/project/quality_gate?id=KarmaCummunity_KC-MVP-server
2. הגדר:
   - ✅ **New Bugs = 0**
   - ✅ **New Vulnerabilities = 0** (High/Critical)
   - ✅ **New Security Hotspots Reviewed = 100%**
   - ✅ **New Code Coverage >= 80%** (או לפי הסטנדרט שלכם)
   - ✅ **Duplicated Lines on New Code < 3%**

**קריטריון להצלחה:**
- SonarCloud Quality Gate = PASSED
- בעיות בקוד ישן לא חוסמות

---

### 4. Tests - בדיקת טסטים

**מה נבדק:**
- כל הטסטים חייבים לעבור
- Coverage report מופק

**דוגמה:**
```bash
# בדיקה מקומית
npm test

# עם coverage
npm run test:cov

# CI mode
npm run test:ci
```

**קריטריון להצלחה:**
- כל הטסטים עוברים (0 failures)
- אין errors בהרצת הטסטים

---

## 💻 שימוש מקומי

### בדיקה מקומית לפני Push

```bash
# בדיקה מהירה של הכל
./scripts/check-quality-gate.sh

# בדיקה מול branch מסוים
./scripts/check-quality-gate.sh dev

# בדיקת Snyk בלבד
./scripts/check-snyk-delta.sh
```

### Hooks אוטומטיים

#### Pre-Commit (אוטומטי)
```bash
# מתבצע אוטומטית בכל git commit
# בודק:
# - ESLint על קבצים staged
# - TypeScript compilation
```

#### Pre-Push (אוטומטי)
```bash
# מתבצע אוטומטית בכל git push
# מריץ את check-quality-gate.sh

# לדלג על הבדיקה (לא מומלץ!)
git push --no-verify
```

### דוגמת תהליך עבודה:

```bash
# 1. עשית שינויים
vim src/controllers/users.controller.ts

# 2. Stage
git add src/controllers/users.controller.ts

# 3. Commit (pre-commit hook רץ אוטומטית)
git commit -m "fix: update user validation"
# ✅ Pre-commit checks passed

# 4. Push (pre-push hook רץ אוטומטית)
git push origin feature/my-branch
# 🔍 Running pre-push quality gate...
# ✅ Quality Gate passed - safe to push

# 5. יצירת PR - GitHub Actions רץ אוטומטית
```

---

## ⚙️ הגדרת CI/CD

### GitHub Actions

הקובץ `.github/workflows/quality-gate.yml` מגדיר את הבדיקות ב-CI/CD.

#### Secrets נדרשים:

הוסף ב-GitHub Repository Settings → Secrets:

```
SONAR_TOKEN       - Token מ-SonarCloud
SNYK_TOKEN        - Token מ-Snyk (אופציונלי)
GITHUB_TOKEN      - נוצר אוטומטית
```

#### קבלת Tokens:

**SonarCloud:**
1. לך ל: https://sonarcloud.io/account/security
2. צור token חדש
3. העתק והוסף ל-GitHub Secrets

**Snyk:**
1. לך ל: https://app.snyk.io/account
2. לחץ על "Click to show" תחת Auth Token
3. העתק והוסף ל-GitHub Secrets

### הגדרת Branch Protection

ב-GitHub Repository Settings → Branches:

```
Branch name pattern: main
✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  
Status checks that are required:
  ✅ Quality Gate Check
  ✅ SonarCloud
  ✅ quality-gate-summary

✅ Require review from Code Owners (אופציונלי)
✅ Include administrators (מומלץ)
```

זה מבטיח ש-**לא ניתן לעשות merge אם Quality Gate נכשל**.

---

## 🐛 פתרון תקלות

### שגיאה: "ESLint found issues"

**בעיה:** יש שגיאות linting בקבצים שהשתנו

**פתרון:**
```bash
# הרץ ESLint עם תיקון אוטומטי
npm run lint -- --fix

# בדוק שגיאות שנותרו
npm run lint

# תקן ידנית את מה שנשאר
```

---

### שגיאה: "Snyk found high/critical vulnerabilities"

**בעיה:** פגיעויות אבטחה חדשות

**פתרון:**
```bash
# בדוק איזה dependencies פגיעים
snyk test

# נסה לתקן אוטומטית
snyk wizard

# או עדכן dependencies ידנית
npm update <package-name>

# אם זה false positive, הוסף ל-.snyk exclusion
```

**דוגמה להוספת exclusion:**
```yaml
# .snyk
exclude:
  code:
    - 'src/path/to/file.ts > javascript/RuleId'
```

---

### שגיאה: "SonarCloud Quality Gate failed"

**בעיה:** SonarCloud מצא בעיות איכות בקוד החדש

**פתרון:**
```bash
# 1. בדוק בדוח SonarCloud מה הבעיות
# לך ל: https://sonarcloud.io/project/overview?id=KarmaCummunity_KC-MVP-server

# 2. סנן ל-"New Code" בלבד

# 3. תקן את הבעיות שמופיעות

# 4. הרץ מקומית
npm run test:cov  # לוודא coverage

# 5. Push שוב
git push
```

**בעיות נפוצות:**
- **Low Coverage:** הוסף טסטים לקוד החדש
- **Code Smells:** שפר את structure הקוד
- **Duplicated Code:** עשה refactor להוציא קוד חוזר

---

### שגיאה: "Tests failed"

**בעיה:** הטסטים לא עוברים

**פתרון:**
```bash
# 1. הרץ את הטסטים מקומית
npm test

# 2. הרץ טסט ספציפי
npm test -- users.controller.spec.ts

# 3. הרץ עם watch mode לפיתוח
npm run test:watch

# 4. בדוק coverage
npm run test:cov

# 5. תקן את הטסטים שנכשלים
```

---

### דילוג על Quality Gate (חירום בלבד!)

**⚠️ לא מומלץ! השתמש רק במקרי חירום**

```bash
# דילוג על pre-commit hook
git commit --no-verify

# דילוג על pre-push hook
git push --no-verify
```

**הערה:** זה **לא ידלג** על ה-CI/CD checks! רק על הבדיקות המקומיות.

---

## 📊 דוח איכות

### הצגת סטטוס נוכחי

```bash
# בדיקה מקומית מלאה
./scripts/check-quality-gate.sh

# Output דוגמה:
# ╔════════════════════════════════════════════╗
# ║           Quality Gate Check               ║
# ╚════════════════════════════════════════════╝
# 
# 1️⃣  Detecting Changed Files
# Found 3 changed TypeScript file(s)
# 
# 2️⃣  Running ESLint on Changed Files
# ✅ ESLint passed - no issues
# 
# 3️⃣  Checking TypeScript Compilation
# ✅ TypeScript compilation successful
# 
# 4️⃣  Running Tests
# ✅ All tests passed
# 
# 5️⃣  Checking for Security Vulnerabilities
# ✅ No high/critical security vulnerabilities
# 
# ╔════════════════════════════════════════════╗
# ║              FINAL SUMMARY                 ║
# ╚════════════════════════════════════════════╝
# 
# ✅ Quality Gate PASSED
```

---

## 🔧 תחזוקה

### עדכון Baseline של Snyk

```bash
# כאשר מתקנים בעיות ישנות, עדכן את ה-baseline
./scripts/check-snyk-delta.sh

# הקובץ .snyk-baseline.json יתעדכן אוטומטית
```

### עדכון SonarCloud Quality Gate

1. לך ל: https://sonarcloud.io/project/quality_gates?id=KarmaCummunity_KC-MVP-server
2. עדכן את הכללים לפי צורך
3. שמור

השינויים יכנסו לתוקף מיד בהרצה הבאה.

---

## 📚 משאבים נוספים

- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [Snyk Documentation](https://docs.snyk.io/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## 🆘 עזרה

אם נתקלת בבעיות:

1. **בדוק את הלוגים** - ה-CI/CD מספק לוגים מפורטים
2. **הרץ מקומית** - `./scripts/check-quality-gate.sh`
3. **בדוק documentation** - קרא את ה-errors בקפידה
4. **שאל את הצוות** - אולי מישהו כבר נתקל בבעיה דומה

---

**עודכן לאחרונה:** {{ now }}
