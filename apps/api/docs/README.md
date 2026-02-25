# KC API Documentation

תיעוד מקיף לשרת ה-API של Karma Community.

## 📚 מדריכים זמינים

### 🚀 Setup & Installation

- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** - מדריך הפעלה מקומית מלא
- **[../SETUP_GUIDE.md](../SETUP_GUIDE.md)** - מדריך הגדרה כללי
- **[../INSTALLATION_GUIDE.md](../INSTALLATION_GUIDE.md)** - הוראות התקנה

### 🔒 Security

- **[../SECURITY.md](../SECURITY.md)** - מדיניות אבטחה וניהול secrets

### ✅ Quality & Testing

- **[QUALITY_GATE.md](./QUALITY_GATE.md)** - מדריך מלא למערכת Quality Gate
- **[QUALITY_GATE_ARCHITECTURE.md](./QUALITY_GATE_ARCHITECTURE.md)** - ארכיטקטורה טכנית
- **[../QUALITY_GATE_SETUP.md](../QUALITY_GATE_SETUP.md)** - מדריך התקנה מהיר
- **[../QUALITY_GATE_SUMMARY.md](../QUALITY_GATE_SUMMARY.md)** - סיכום מערכת Quality Gate

---

## 🎯 Quick Links לפי נושא

### אני רוצה...

#### להתחיל לעבוד על הפרויקט
→ קרא: [LOCAL_SETUP.md](./LOCAL_SETUP.md)

#### להבין איך עובד Quality Gate
→ קרא: [QUALITY_GATE.md](./QUALITY_GATE.md)

#### להגדיר Quality Gate
→ קרא: [../QUALITY_GATE_SETUP.md](../QUALITY_GATE_SETUP.md)

#### לתקן שגיאות Quality Gate
→ קרא: [QUALITY_GATE.md](./QUALITY_GATE.md) → פרק "פתרון תקלות"

#### להבין את הארכיטקטורה של Quality Gate
→ קרא: [QUALITY_GATE_ARCHITECTURE.md](./QUALITY_GATE_ARCHITECTURE.md)

#### לדעת איך לנהל secrets
→ קרא: [../SECURITY.md](../SECURITY.md)

#### להריץ בדיקות לפני push
→ הרץ: `npm run quality:gate`

---

## 📋 תוכן המדריכים

### Quality Gate Documentation

#### [QUALITY_GATE.md](./QUALITY_GATE.md)
מדריך משתמש מקיף בעברית:
- סקירה כללית
- איך זה עובד
- בדיקות שמתבצעות
- שימוש מקומי
- הגדרת CI/CD
- פתרון תקלות

#### [QUALITY_GATE_ARCHITECTURE.md](./QUALITY_GATE_ARCHITECTURE.md)
תיעוד טכני מפורט:
- תרשים ארכיטקטורה
- מבנה קבצים
- שכבות בדיקה
- זיהוי בעיות חדשות
- תהליך עדכון baseline
- Troubleshooting

#### [../QUALITY_GATE_SETUP.md](../QUALITY_GATE_SETUP.md)
מדריך התקנה מהיר:
- התקנה ב-4 שלבים
- בדיקה שהכל עובד
- שימוש יומיומי
- פתרון בעיות נפוצות

#### [../QUALITY_GATE_SUMMARY.md](../QUALITY_GATE_SUMMARY.md)
סיכום כולל:
- מה נעשה
- מה כולל
- איך זה עובד
- יתרונות
- Checklist

---

## 🔧 Scripts Documentation

### Quality Gate Scripts

```bash
# בדיקה מקומית מלאה
npm run quality:gate
./scripts/check-quality-gate.sh

# בדיקת אבטחה בלבד
npm run quality:snyk
./scripts/check-snyk-delta.sh

# בדיקה מלאה (lint + tests + security)
npm run quality:full
```

לתיעוד מלא של הסקריפטים: [../scripts/README.md](../scripts/README.md)

---

## 🎓 Learning Path

### למתחילים בפרויקט:

1. **קרא:** [LOCAL_SETUP.md](./LOCAL_SETUP.md)  
   → הבן איך להפעיל את הפרויקט מקומית

2. **קרא:** [../QUALITY_GATE_SETUP.md](../QUALITY_GATE_SETUP.md)  
   → הגדר Quality Gate

3. **נסה:** `npm run quality:gate`  
   → הרץ בדיקה מקומית

### למפתחים מתקדמים:

1. **קרא:** [QUALITY_GATE_ARCHITECTURE.md](./QUALITY_GATE_ARCHITECTURE.md)  
   → הבן את הארכיטקטורה

2. **קרא:** [QUALITY_GATE.md](./QUALITY_GATE.md)  
   → למד כל פרט על הבדיקות

3. **התאם אישית:** עדכן `.github/workflows/` לפי הצורך

---

## 🆘 צריך עזרה?

### שגיאות נפוצות

| שגיאה | מדריך |
|-------|--------|
| Quality Gate failed | [QUALITY_GATE.md](./QUALITY_GATE.md) → פתרון תקלות |
| ESLint errors | [QUALITY_GATE.md](./QUALITY_GATE.md) → ESLint |
| Snyk vulnerabilities | [QUALITY_GATE.md](./QUALITY_GATE.md) → Snyk Security |
| SonarCloud failed | [QUALITY_GATE.md](./QUALITY_GATE.md) → SonarCloud |
| Tests failed | [QUALITY_GATE.md](./QUALITY_GATE.md) → Tests |

### תרומה לתיעוד

מצאת שגיאה או רוצה לשפר את התיעוד?
1. פתח Issue
2. שלח Pull Request
3. עקוב אחר ה-contributing guidelines

---

## 📝 Convention

כל מדריך בתיקייה זו עוקב אחר המבנה הבא:
- **כותרת ראשית** - שם המדריך
- **תוכן עניינים** - קישורים מהירים
- **סעיפים מרכזיים** - תוכן מפורט
- **דוגמאות** - קוד ודוגמאות שימוש
- **Troubleshooting** - פתרון בעיות נפוצות
- **משאבים נוספים** - קישורים חיצוניים

---

**עודכן:** 2026-02-25
