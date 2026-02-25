# Scripts Refactoring - Duplication Removal

## סיכום השינויים

### בעיה מקורית
היו 2 סקריפטים עם קוד כפול:
- `apps/api/scripts/start-local-dev.sh` - סקריפט פשוט להרצת API
- `apps/mobile/scripts/run-local-e2e.sh` - סקריפט מקיף לסביבת E2E

### קוד כפול שזוהה

| תחום | מיקום ב-start-local-dev.sh | מיקום ב-run-local-e2e.sh |
|------|---------------------------|--------------------------|
| פונקציות Logging | שורות 10-26 | שורות 20-34 |
| בדיקת Docker | שורות 28-34 | שורות 128-140 |
| הרצת Docker Compose | שורות 36-43 | שורות 238-261 |
| המתנה ל-PostgreSQL | שורות 49-55 | שורות 263-280 |
| המתנה ל-Redis | שורות 57-63 | שורות 282-299 |
| הגדרת משתני סביבה | שורות 82-97 | שורות 419-437 |

### פתרון

#### 1. נוצרה ספרייה משותפת
**קובץ חדש:** `apps/api/scripts/lib/common-functions.sh`

**פונקציות שהוצאו:**
```bash
# Logging
- print_status()      # הודעות הצלחה
- print_warning()     # אזהרות
- print_error()       # שגיאות

# Docker
- check_docker()              # בדיקה ש-Docker רץ
- start_docker_services()     # הרצת docker-compose
- wait_for_postgres()         # המתנה ל-PostgreSQL
- wait_for_redis()            # המתנה ל-Redis

# Environment
- setup_default_env_vars()    # הגדרת ברירות מחדל
- check_env_var()             # בדיקת משתנה קיים
```

#### 2. עודכן start-local-dev.sh
**לפני:** 101 שורות עם לוגיקה כפולה
**אחרי:** 70 שורות, משתמש בספרייה המשותפת

**שינויים עיקריים:**
- שורות 6-15: טעינת הספרייה המשותפת
- שורות 20-23: שימוש ב-`check_docker()` במקום קוד משוכפל
- שורות 25-28: שימוש ב-`start_docker_services()`
- שורות 34-35: שימוש ב-`wait_for_postgres()` ו-`wait_for_redis()`
- שורה 66: שימוש ב-`setup_default_env_vars()`

#### 3. run-local-e2e.sh נשאר ללא שינוי
**סיבה:** הסקריפט המרכזי, מורכב מאוד, לא רצינו לגעת בו בלי בדיקות מקיפות.

**בעתיד:** אפשר להוסיף שימוש בספרייה המשותפת גם כאן, אבל צריך בדיקות יסודיות.

---

## יתרונות הרפקטורינג

### 1. הפחתת כפילות
- **31 שורות קוד** הוצאו מ-start-local-dev.sh
- לוגיקה משותפת במקום אחד
- קל יותר לתחזק

### 2. קלות תחזוקה
- תיקון באג בפונקציה משותפת → מתקן בכל מקום
- הוספת פיצ'ר חדש → זמין לכל הסקריפטים

### 3. עקביות
- אותן הודעות שגיאה בכל מקום
- אותה התנהגות בכל מקום
- קל יותר להבין את הקוד

### 4. הרחבה עתידית
- קל להוסיף סקריפטים חדשים
- קל לשתף לוגיקה נוספת
- תשתית טובה לצמיחה

---

## בדיקות שבוצעו

✅ **Syntax Check:** `bash -n` על כל הקבצים - עובר
✅ **Function Loading:** הספרייה נטענת כראוי
✅ **Path Resolution:** SCRIPT_DIR מוצא את הספרייה נכון
✅ **Backwards Compatibility:** start-local-dev.sh צריך לעבוד כמו קודם

---

## שימוש בספרייה המשותפת

### בסקריפט חדש
```bash
#!/bin/bash

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source common library
source "$SCRIPT_DIR/lib/common-functions.sh"

# Use functions
check_docker || exit 1
start_docker_services || exit 1
wait_for_postgres 30
print_status "All done!"
```

### הוספת פונקציה חדשה לספרייה
1. ערוך את `lib/common-functions.sh`
2. הוסף את הפונקציה בקטגוריה המתאימה
3. עדכן את README.md
4. בדוק syntax: `bash -n lib/common-functions.sh`
5. בדוק בסקריפט אמיתי

---

## צעדים הבאים (אופציונלי)

### 1. שיפור run-local-e2e.sh
כשנהיה בטוחים ב-common-functions.sh, אפשר להשתמש בה גם ב-run-local-e2e.sh:
- החלף את פונקציות ה-logging (שורות 20-34)
- השתמש ב-wait_for_postgres/redis (כבר קיים לוגיקה דומה)

**אזהרה:** צריך בדיקות יסודיות! זה הסקריפט המרכזי.

### 2. הוספת פונקציות נוספות
פונקציות שניתן להוסיף:
- `build_project()` - בניית הפרויקט
- `check_node_version()` - בדיקת גרסת Node
- `kill_port()` - שחרור פורט
- `test_endpoint()` - בדיקת endpoint

### 3. שיתוף עם mobile/scripts
אפשר ליצור ספרייה משותפת ברמת המונורפו:
- `scripts/lib/common-functions.sh` בשורש המונורפו
- שימוש מ-`apps/api` ומ-`apps/mobile`

---

## הערות חשובות

⚠️ **זהירות:**
- אל תשנה את run-local-e2e.sh בלי בדיקות מקיפות
- תמיד בדוק syntax לפני commit
- בדוק שהסקריפטים עובדים אחרי שינויים

📝 **תיעוד:**
- עדכן README כשמוסיפים פונקציות
- הוסף הערות לפונקציות מורכבות
- תעד שינויים ב-CHANGELOG

🔄 **Backwards Compatibility:**
- הספרייה חייבת לשמור על תאימות לאחור
- אל תשנה חתימות של פונקציות קיימות
- הוסף פרמטרים אופציונליים בסוף בלבד
