# הוראות הרצת מיגרציה - היררכיית הרשאות

## ⚠️ חשוב מאוד

**המיגרציה חייבת לרוץ לפני שהפיצ'ר יעבוד במלואו!**

כרגע הקוד עובד עם fallback (בלי `hierarchy_level`), אבל כדי שהכל יעבוד נכון, צריך להריץ את המיגרציה.

## שלבים להרצת המיגרציה

### 1. גיבוי DB (חובה!)
```bash
# גבה את ה-DB לפני המיגרציה!
pg_dump -d your_database_name > backup_before_hierarchy_$(date +%Y%m%d_%H%M%S).sql
```

### 2. בדיקה שהמיגרציה תקינה
```bash
# בדוק שהקובץ קיים
ls -la KC-MVP-server/migrations/add-hierarchy-levels.sql
```

### 3. הרצת המיגרציה על DB בדיקה
```bash
# הרץ על DB בדיקה קודם!
psql -d your_test_database -f KC-MVP-server/migrations/add-hierarchy-levels.sql
```

### 4. בדיקה שהמיגרציה עבדה
```sql
-- בדוק שהעמודה קיימת
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'hierarchy_level';

-- בדוק שהמנהל הראשי נכון
SELECT email, hierarchy_level, parent_manager_id 
FROM user_profiles 
WHERE email = 'karmacommunity2.0@gmail.com';
-- צפוי: hierarchy_level = 0, parent_manager_id = NULL

-- בדוק שהסופר מנהלים נכונים
SELECT email, hierarchy_level, parent_manager_id 
FROM user_profiles 
WHERE email IN ('navesarussi@gmail.com', 'mahalalel100@gmail.com');
-- צפוי: hierarchy_level = 1, parent_manager_id = ID של karmacommunity2.0@gmail.com
```

### 5. רק אחרי בדיקה מוצלחת - הרצה על פרודקשן
```bash
# ⚠️ רק אחרי שבדקת על DB בדיקה!
psql -d your_production_database -f KC-MVP-server/migrations/add-hierarchy-levels.sql
```

## מה המיגרציה עושה?

1. **מוסיפה עמודה `hierarchy_level`** - דרגה בהיררכיה
2. **יוצרת טבלת `user_hierarchy_history`** - היסטוריית שינויים
3. **יוצרת פונקציה `calculate_hierarchy_level()`** - חישוב דרגה אוטומטי
4. **יוצרת trigger `update_hierarchy_level()`** - עדכון אוטומטי
5. **מגדיר דרגות ראשוניות**:
   - דרגה 0: `karmacommunity2.0@gmail.com` (המנהל הראשי)
   - דרגה 1: `navesarussi@gmail.com`, `mahalalel100@gmail.com`
   - שאר המשתמשים: `hierarchy_level = NULL`

## מה קורה אם לא אריץ את המיגרציה?

- הקוד יעבוד עם fallback (בלי `hierarchy_level`)
- לא תראה דרגות ב-UI
- לא תראה טאב "מתנדבים"
- הפיצ'ר לא יעבוד במלואו

## מה קורה אחרי הרצת המיגרציה?

- ✅ תראה דרגות ב-UI
- ✅ תראה טאב "מתנדבים"
- ✅ המנהל הראשי תמיד `parent_manager_id = NULL`
- ✅ כל השינויים נשמרים בהיסטוריה
- ✅ דרגות מחושבות אוטומטית

## בעיות נפוצות

### שגיאה: "column hierarchy_level does not exist"
**פתרון**: המיגרציה לא רצה. הרץ אותה לפי ההוראות למעלה.

### שגיאה: "relation user_hierarchy_history does not exist"
**פתרון**: המיגרציה לא רצה. הרץ אותה לפי ההוראות למעלה.

### המנהל הראשי עדיין מדווח למישהו
**פתרון**: הרץ את המיגרציה - היא תתקן את זה אוטומטית.

---

**מוכן להרצה?** התחל עם גיבוי DB ואז הרץ על DB בדיקה!


