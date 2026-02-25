# Quality Gate - ארכיטקטורה ומבנה

## 📐 תרשים ארכיטקטורה

```
Developer Workflow
==================

┌─────────────────────────────────────────────────────────────────┐
│  1. Local Development                                           │
│                                                                  │
│  Developer writes code                                          │
│         ↓                                                        │
│  git add <files>                                                │
│         ↓                                                        │
│  ╔═══════════════════════════════════════╗                      │
│  ║  Pre-Commit Hook (.husky/pre-commit) ║                      │
│  ║  • ESLint on staged files            ║                      │
│  ║  • TypeScript compilation check      ║                      │
│  ╚═══════════════════════════════════════╝                      │
│         ↓ (if passed)                                           │
│  git commit -m "..."                                            │
│         ↓                                                        │
│  ╔═══════════════════════════════════════╗                      │
│  ║  Pre-Push Hook (.husky/pre-push)     ║                      │
│  ║  Runs: check-quality-gate.sh         ║                      │
│  ║  • Changed files detection           ║                      │
│  ║  • ESLint on changed files           ║                      │
│  ║  • TypeScript compilation            ║                      │
│  ║  • Tests + Coverage                  ║                      │
│  ║  • Snyk security scan (delta)        ║                      │
│  ║  • Sensitive data detection          ║                      │
│  ╚═══════════════════════════════════════╝                      │
│         ↓ (if passed)                                           │
│  git push origin <branch>                                       │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. GitHub (Remote)                                             │
│                                                                  │
│  Pull Request Created                                           │
│         ↓                                                        │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  GitHub Actions - PR Quality Check                       ║  │
│  ║  (pr-quality-check.yml)                                  ║  │
│  ║                                                          ║  │
│  ║  1. Detect changed files (base...head)                  ║  │
│  ║  2. ESLint on changed files                             ║  │
│  ║  3. Tests + Coverage                                    ║  │
│  ║  4. SonarCloud Scan                                     ║  │
│  ║  5. Snyk Security Scan                                  ║  │
│  ║  6. Comment results on PR                               ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│         ↓                                                        │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  GitHub Actions - Quality Gate                          ║  │
│  ║  (quality-gate.yml)                                     ║  │
│  ║                                                          ║  │
│  ║  1. Changed files detection                             ║  │
│  ║  2. ESLint validation                                   ║  │
│  ║  3. Snyk Code + Dependencies                            ║  │
│  ║  4. Tests with coverage                                 ║  │
│  ║  5. SonarCloud scan                                     ║  │
│  ║  6. Check SonarCloud Quality Gate status                ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│         ↓                                                        │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  Branch Protection Rules                                 ║  │
│  ║  • All checks must pass                                  ║  │
│  ║  • Branch must be up to date                             ║  │
│  ║  • Blocks merge if any check fails                       ║  │
│  ╚═══════════════════════════════════════════════════════════╝  │
│         ↓ (if all passed)                                       │
│  Merge to main ✅                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ מבנה קבצים

```
apps/api/
│
├── .github/workflows/
│   ├── quality-gate.yml          # CI/CD Quality Gate (main workflow)
│   ├── pr-quality-check.yml      # PR-specific checks with comments
│   └── sonar.yml                 # SonarCloud scan (legacy)
│
├── .husky/
│   ├── pre-commit               # ESLint + TypeScript on staged files
│   └── pre-push                 # Full quality gate before push
│
├── scripts/
│   ├── check-quality-gate.sh    # Main quality gate script
│   ├── check-snyk-delta.sh      # Snyk delta (new issues only)
│   └── lib/
│       └── common-functions.sh  # Shared functions
│
├── docs/
│   ├── QUALITY_GATE.md                  # User guide (Hebrew)
│   └── QUALITY_GATE_ARCHITECTURE.md    # This file
│
├── QUALITY_GATE_SETUP.md         # Quick setup guide
│
├── .snyk                          # Snyk policy (false positives)
├── sonar-project.properties       # SonarCloud configuration
├── .gitignore                     # Excludes .snyk-baseline.json
└── package.json                   # Scripts: quality:gate, quality:snyk
```

---

## 🔍 שכבות הבדיקה

### שכבה 1: Pre-Commit Hook (מקומי)
**מטרה:** מניעת commit של קוד עם בעיות בסיסיות

**מה נבדק:**
- ✅ ESLint על קבצים ב-staging area בלבד
- ✅ TypeScript compilation

**כשל:** Commit נחסם

**קובץ:** `.husky/pre-commit`

---

### שכבה 2: Pre-Push Hook (מקומי)
**מטרה:** בדיקה מקיפה לפני push (חוסך זמן CI/CD)

**מה נבדק:**
- ✅ ESLint על כל הקבצים שהשתנו (מול branch בסיס)
- ✅ TypeScript compilation
- ✅ Tests + Coverage
- ✅ Snyk security scan (רק בעיות חדשות)
- ✅ Sensitive data detection
- ℹ️ TODO comments report

**כשל:** Push נחסם

**קובץ:** `.husky/pre-push` → קורא ל-`scripts/check-quality-gate.sh`

---

### שכבה 3: GitHub Actions - PR Quality Check
**מטרה:** בדיקה אוטומטית על Pull Requests + תגובה אוטומטית

**מה נבדק:**
- ✅ ESLint על קבצים שהשתנו
- ✅ Tests + Coverage
- ✅ SonarCloud scan
- ✅ Snyk security scan
- ✅ הוספת תגובה אוטומטית ל-PR עם תוצאות

**כשל:** Status check נכשל, אבל PR לא נחסם (תלוי בהגדרת Branch Protection)

**קובץ:** `.github/workflows/pr-quality-check.yml`

---

### שכבה 4: GitHub Actions - Quality Gate (Main)
**מטרה:** בדיקה מקיפה לפני merge

**מה נבדק:**
- ✅ ESLint על קבצים שהשתנו
- ✅ Snyk Code (SAST)
- ✅ Snyk Dependencies
- ✅ Tests + Coverage
- ✅ SonarCloud scan
- ✅ SonarCloud Quality Gate status (API call)

**כשל:** Merge נחסם (Branch Protection)

**קובץ:** `.github/workflows/quality-gate.yml`

---

### שכבה 5: Branch Protection Rules
**מטרה:** אכיפה - מניעת merge אם Quality Gate נכשל

**הגדרות:**
- ✅ Require status checks to pass before merging
  - Quality Gate Check
  - SonarCloud
  - quality-gate-summary
- ✅ Require branches to be up to date before merging
- ✅ Include administrators (אפשרות מומלצת)

**כשל:** כפתור Merge מושבת ב-GitHub UI

**מיקום:** GitHub Repository Settings → Branches

---

## 🎯 זיהוי בעיות חדשות בלבד

### שיטה 1: Git Diff (ESLint, TypeScript)
**איך זה עובד:**
```bash
# מציאת קבצים שהשתנו
git diff --name-only --diff-filter=ACMRT base...HEAD | grep '.ts$'

# הרצת ESLint רק על הקבצים האלה
npm run lint -- file1.ts file2.ts file3.ts
```

**יתרונות:**
- מהיר מאוד
- מזהה רק שינויים בקוד החדש

**חסרונות:**
- לא מזהה בעיות שנגרמו בקבצים אחרים (dependencies)

---

### שיטה 2: Snyk Delta (Security)
**איך זה עובד:**
```bash
# הרצה ראשונה - יצירת baseline
snyk test --json > .snyk-baseline.json

# הרצות הבאות - השוואה
snyk test --json > .snyk-current.json
diff .snyk-baseline.json .snyk-current.json
# → זיהוי רק בעיות חדשות
```

**יתרונות:**
- מזהה רק בעיות חדשות
- מאפשר technical debt קיים

**חסרונות:**
- דורש שמירת baseline
- Baseline צריך עדכון כשמתקנים בעיות

**קובץ:** `scripts/check-snyk-delta.sh`

---

### שיטה 3: SonarCloud New Code Period
**איך זה עובד:**
```properties
# sonar-project.properties
sonar.newCode.referenceBranch=main
sonar.pullrequest.base=main
```

SonarCloud משווה את הקוד ב-PR למצב ב-`main` ומדווח רק על בעיות בקוד החדש.

**Quality Gate Rules מוגדרות ב-SonarCloud UI:**
- New Bugs = 0
- New Vulnerabilities = 0
- New Security Hotspots Reviewed = 100%

**יתרונות:**
- מנוהל בענן
- תמיכה מלאה ב-Pull Requests
- דוחות מפורטים

**חסרונות:**
- דורש SONAR_TOKEN
- תלוי בשירות חיצוני

---

### שיטה 4: GitHub Actions - Changed Files
**איך זה עובד:**
```yaml
- name: Get changed files
  run: |
    BASE_SHA="${{ github.event.pull_request.base.sha }}"
    HEAD_SHA="${{ github.event.pull_request.head.sha }}"
    
    git diff --name-only $BASE_SHA...$HEAD_SHA | grep '.ts$'
```

**יתרונות:**
- מובנה ב-GitHub
- מדויק למצב ה-PR

---

## 🔄 תהליך עדכון Baseline

### Snyk Baseline
```bash
# אחרי תיקון בעיות ישנות
./scripts/check-snyk-delta.sh
# → הסקריפט יוצר baseline חדש אוטומטית
```

### SonarCloud
```bash
# SonarCloud מעדכן אוטומטית את ה-baseline
# הbaseline הוא תמיד המצב האחרון ב-main branch
git push origin main
# → SonarCloud יעדכן את ה-reference
```

---

## 🚨 מה קורה כאשר Quality Gate נכשל?

### Scenario 1: Pre-Commit נכשל
```bash
$ git commit -m "add feature"

Running pre-commit hook...
❌ ESLint found issues in staged files

Fix linting errors before committing
```

**פתרון:**
```bash
npm run lint -- --fix
git add .
git commit -m "add feature"
```

---

### Scenario 2: Pre-Push נכשל
```bash
$ git push origin feature/my-branch

Running pre-push quality gate...
❌ Quality Gate FAILED
- Tests failed
- Snyk found high severity vulnerability

Please fix the issues before pushing
```

**פתרון:**
```bash
# תקן טסטים
npm test

# תקן vulnerability
snyk wizard

# נסה push שוב
git push origin feature/my-branch
```

**דילוג (חירום):**
```bash
git push --no-verify
# ⚠️ לא ידלג על CI/CD checks!
```

---

### Scenario 3: GitHub Actions נכשל
```
Pull Request #123
Status: ❌ Some checks failed

✅ PR Quality Check
❌ Quality Gate Check (failed)
  └─ SonarCloud Quality Gate: ERROR
```

**פתרון:**
1. לחץ על "Details" ליד השגיאה
2. ראה את הלוגים המפורטים
3. תקן את הבעיות
4. Push שוב (Actions ירוץ אוטומטית)

**לא ניתן ל-merge** עד שכל ה-checks יעברו.

---

### Scenario 4: SonarCloud Quality Gate נכשל
```
SonarCloud Quality Gate: ERROR
- 3 new bugs found
- Coverage on new code: 45% (required: 80%)
```

**פתרון:**
1. לך ל-SonarCloud dashboard
2. סנן ל-"New Code"
3. תקן את הבעיות המפורטות
4. הוסף tests (עד 80% coverage)
5. Push שוב

---

## 📊 מטריקות ודיווח

### Local Reporting
```bash
$ ./scripts/check-quality-gate.sh

╔════════════════════════════════════════════╗
║           Quality Gate Check               ║
╚════════════════════════════════════════════╝

1️⃣  Detecting Changed Files
Found 5 changed TypeScript file(s)

2️⃣  Running ESLint
✅ ESLint passed

3️⃣  TypeScript Compilation
✅ Compilation successful

4️⃣  Running Tests
✅ All tests passed
Coverage: Lines 85% | Statements 84% | Functions 88%

5️⃣  Security Scan
✅ No high/critical vulnerabilities

╔════════════════════════════════════════════╗
║              FINAL SUMMARY                 ║
╚════════════════════════════════════════════╝

✅ Quality Gate PASSED
```

### GitHub Actions Reporting
- ✅ Job Summary (GITHUB_STEP_SUMMARY)
- ✅ PR Comments (via github-script)
- ✅ Check annotations (failures)
- ✅ SARIF upload (Snyk results → Security tab)

### SonarCloud Reporting
- Dashboard עם בעיות חדשות
- Drill-down לקבצים ספציפיים
- Historical trends
- PR Decoration (תגובות אוטומטיות ב-PR)

---

## 🔐 אבטחה

### Secrets Management
**Secrets נדרשים:**
- `SONAR_TOKEN` - SonarCloud authentication
- `SNYK_TOKEN` - Snyk authentication (אופציונלי)
- `GITHUB_TOKEN` - נוצר אוטומטית

**איפה מוגדרים:**
- GitHub Repository → Settings → Secrets and variables → Actions

**לא נשמרים ב-git:**
- `.env` files
- `.snyk-baseline.json`
- `.snyk-current.json`

### Sensitive Data Detection
```bash
# הסקריפט check-quality-gate.sh בודק דפוסים:
- password=...
- api_key=...
- secret=...
- token=...
- BEGIN PRIVATE KEY
```

---

## 🎓 Best Practices

### 1. הרץ בדיקה מקומית לפני push
```bash
npm run quality:gate
```
חוסך זמן CI/CD ומזהה בעיות מוקדם.

### 2. תקן בעיות בהדרגה
אל תנסה לתקן את כל ה-technical debt בבת אחת.  
התמקד בקוד החדש - הבעיות הישנות לא חוסמות.

### 3. השתמש ב-false-positive exclusions
אם Snyk/SonarCloud מדווח על false positive:
```yaml
# .snyk
exclude:
  code:
    - 'src/path/to/file.ts > javascript/RuleId'
```

### 4. עדכן baseline אחרי תיקונים
```bash
./scripts/check-snyk-delta.sh
# → יעדכן baseline אוטומטית
```

### 5. השתמש ב-lint-staged לביצועים טובים
```json
{
  "lint-staged": {
    "src/**/*.{js,ts}": "eslint --fix"
  }
}
```

---

## 🔧 Troubleshooting

### Git hooks לא רצים
```bash
# ודא ש-Husky מותקן
npx husky install

# ודא שה-hooks הם executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### SonarCloud לא מקבל coverage
```bash
# ודא שקובץ coverage קיים
npm run test:cov
ls -la coverage/lcov.info

# בדוק sonar-project.properties
cat sonar-project.properties | grep lcov
```

### Snyk Token לא עובד
```bash
# בדוק את הtoken
echo $SNYK_TOKEN

# התחבר מחדש
snyk auth $SNYK_TOKEN
```

---

## 📚 משאבים נוספים

- [SonarCloud Quality Gates](https://docs.sonarcloud.io/improving/quality-gates/)
- [Snyk CLI Documentation](https://docs.snyk.io/snyk-cli)
- [GitHub Actions - Required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [Husky Documentation](https://typicode.github.io/husky/)

---

**עודכן:** 2026-02-25
