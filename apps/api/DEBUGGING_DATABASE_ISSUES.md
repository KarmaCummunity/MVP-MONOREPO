# מדריך לבדיקת בעיות מבנה טבלה

## מה זה אומר?

ההודעה "Database table structure issue" מופיעה כשיש בעיה במבנה הטבלה בבסיס הנתונים. זה יכול להיות:
- עמודה חסרה בטבלה
- טבלה לא קיימת
- בעיה עם אינדקסים

## איך לבדוק מה הבעיה?

### 1. בדיקת לוגי השרת

השגיאה המדויקת מופיעה בלוגי השרת. בדוק:

**ב-Railway:**
1. לך ל-Railway Dashboard
2. בחר את הפרויקט
3. לחץ על "Deployments" או "Logs"
4. חפש שגיאות עם המילים: `does not exist`, `column`, `table`

**בלוקלי:**
```bash
cd KC-MVP-server
# אם השרת רץ, תראה את השגיאות בקונסול
# או בדוק את הלוגים:
tail -f server-output.log
```

### 2. בדיקת מבנה הטבלה ישירות

**באמצעות SQLTools (מומלץ):**
1. פתח את SQLTools ב-VSCode
2. התחבר לבסיס הנתונים
3. הרץ את השאילתה הבאה:

```sql
-- בדוק אם טבלת tasks קיימת
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tasks'
) AS tasks_table_exists;

-- בדוק את העמודות בטבלת tasks
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- בדוק אם יש עמודות חסרות
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'title') THEN 'title חסר'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN 'status חסר'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority') THEN 'priority חסר'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assignees') THEN 'assignees חסר'
        ELSE 'כל העמודות קיימות'
    END AS missing_columns;
```

### 3. בדיקת שגיאות React

השגיאות בקונסול הדפדפן:
- **React error #418**: שגיאת React מיניפייד - פתח את הקוד ב-dev mode כדי לראות את השגיאה המלאה
- **Cross-Origin-Opener-Policy**: בעיית אבטחה בדפדפן - לא קריטי, אבל יכול לגרום לבעיות

### 4. תיקון הבעיה

אם יש עמודות חסרות, הרץ את ה-migration:

```sql
-- הרץ את schema.sql מחדש
-- או הרץ migration ספציפי:
\i src/database/migration-fix-schema-sync.sql
```

## שאילתות שימושיות לבדיקה

```sql
-- בדוק את כל הטבלאות
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- בדוק את כל העמודות בטבלת tasks
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- בדוק את כל האינדקסים
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tasks';
```

## לוגים חשובים לבדיקה

בדוק את הלוגים של השרת עבור:
- `Error listing tasks:`
- `does not exist`
- `column`
- `Schema creation failed`





