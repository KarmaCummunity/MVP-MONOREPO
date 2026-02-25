# Audit Scripts - תיעוד

## סקירה כללית

סקריפטים אלה מבצעים סריקה אוטומטית של כל קבצי הקוד ב-MVP כדי לזהות בעיות תשתית:

- **audit-colors.ts** - מזהה צבעים קשיחים שצריכים לבוא מ-`globals/colors.tsx`
- **audit-texts.ts** - מזהה טקסטים קשיחים שצריכים לעבור דרך i18n
- **audit-constants.ts** - מזהה magic numbers וקבועים שצריכים להיות ב-`globals/constants.tsx`
- **audit-responsive.ts** - מזהה בעיות responsive ושימוש לא נכון בפונקציות
- **find-unused-files.ts** - מזהה קבצים לא בשימוש, כפולים וישנים
- **audit-all.ts** - מריץ את כל הסקריפטים ומייצר דוח מאוחד

## התקנה

לפני הרצה ראשונה, התקן את התלויות:

```bash
npm install
```

הסקריפטים זקוקים ל:
- `ts-node` - להרצת TypeScript ישירות
- `@types/node` - טיפוסים של Node.js

## שימוש

### הרצת סקריפט בודד

```bash
# בדיקת צבעים
npm run audit:colors

# בדיקת טקסטים
npm run audit:texts

# בדיקת קבועים
npm run audit:constants

# בדיקת responsive
npm run audit:responsive

# בדיקת קבצים לא בשימוש
npm run audit:unused
```

### הרצת כל הבדיקות

```bash
npm run audit:all
```

זה ירוץ את כל 5 הסקריפטים ויצור דוח מאוחד.

## פלט

כל הדוחות נשמרים בתיקייה `audit-reports/`:

```
audit-reports/
├── colors-issues.json      # כל בעיות הצבעים
├── texts-issues.json        # כל בעיות הטקסטים
├── constants-issues.json    # כל בעיות הקבועים
├── responsive-issues.json   # כל בעיות ה-responsive
├── unused-files.json        # כל הקבצים הלא בשימוש
├── master-report.json       # דוח JSON מאוחד
└── summary.md              # סיכום קריא בעברית
```

### קריאת הדוחות

1. **summary.md** - התחל כאן! זה סיכום קריא עם תעדוף ותוכנית פעולה
2. **\*-issues.json** - דוחות מפורטים עם מיקום מדויק של כל בעיה

## מבנה הדוח

כל דוח JSON מכיל:

```typescript
{
  "timestamp": "2025-01-01T00:00:00.000Z",
  "totalFiles": 138,
  "filesWithIssues": 45,
  "totalIssues": 234,
  "issuesBySeverity": {
    "critical": 12,
    "high": 56,
    "medium": 89,
    "low": 77
  },
  "issues": [
    {
      "file": "components/HeaderComp.tsx",
      "line": 42,
      "column": 15,
      "type": "hex",
      "severity": "high",
      "value": "#16808C",
      "context": "backgroundColor: '#16808C'",
      "suggestion": "Replace #16808C with colors.primary"
    }
    // ... עוד בעיות
  ]
}
```

## רמות חומרה

- **🔴 Critical** - בעיות קריטיות שצריך לתקן מיד (למשל: חסר import בקובץ production)
- **🟠 High** - בעיות חשובות שצריך לתקן בקרוב (למשל: צבעים קשיחים)
- **🟡 Medium** - בעיות שכדאי לתקן (למשל: קבועים שחוזרים)
- **🟢 Low** - בעיות קלות או קוסמטיות (למשל: קבצים ישנים)

## דוגמאות שימוש

### מציאת כל הצבעים הקשיחים בקובץ מסוים

```bash
npm run audit:colors
# ואז חפש בקובץ colors-issues.json את הקובץ הספציפי
```

### מציאת כל הטקסטים בעברית שלא עוברים דרך i18n

```bash
npm run audit:texts
# בדוק את hardcoded-hebrew ב-texts-issues.json
```

### זיהוי קבצים כפולים

```bash
npm run audit:unused
# בדוק את type: "duplicate" ב-unused-files.json
```

## טיפים

1. **הרץ לפני תיקונים** - כדי לקבל baseline של המצב הנוכחי
2. **הרץ אחרי תיקונים** - כדי לוודא שהבעיות נפתרו
3. **שמור את הדוחות** - כדי לעקוב אחרי התקדמות לאורך זמן
4. **התמקד בחומרה גבוהה** - תקן critical ו-high קודם
5. **עבוד בקובץ אחד בכל פעם** - אל תנסה לתקן הכל בבת אחת

## שאלות נפוצות

### למה הסקריפט לוקח זמן?

הסקריפטים סורקים כ-200 קבצים. זה לוקח 2-5 דקות.

### האם זה בטוח להריץ?

כן! הסקריפטים רק **קוראים** קבצים ולא משנים כלום. הם רק מייצרים דוחות.

### מה אם יש false positives?

זה יכול לקרות. בדוק את ה-context בדוח ותשתמש בשיקול דעת.

### איך אני מתקן את הבעיות?

1. קרא את `summary.md` לתוכנית פעולה
2. פתח את הדוח המפורט הרלוונטי
3. עבור על כל בעיה ותקן לפי ה-suggestion
4. הרץ שוב את הסקריפט לוודא

## תרומה

אם אתה רוצה לשפר את הסקריפטים:

1. הסקריפטים נכתבו ב-TypeScript עם הערות מפורטות
2. כל סקריפט הוא standalone וניתן להרצה עצמאית
3. ניתן להוסיף בדיקות נוספות בקלות

## רישיון

חלק מפרויקט KarmaCommunity - 0BSD License




