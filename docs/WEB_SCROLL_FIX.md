# תיקון בעיית גלילה ב-Web Production

## הבעיה
במסכים הבאים הגלילה לא עבדה בפרודקשן (Railway), אך עבדה בהרצה לוקאלית:
1. גלה אנשים (DiscoverPeopleScreen)
2. צ'אטים (ChatListScreen)
3. שיחה חדשה (NewChatScreen)
4. ניהול קשרים במסך מנהלים (AdminCRMScreen)
5. התראות (NotificationsScreen)

## הסיבה
ב-`web/index.html` היה `overflow-y: auto` על אלמנט `body`, שגרם לגלילה "להיתקע" ברמת ה-body במקום לרדת לקומפוננטים הפנימיים (FlatList/ScrollView/ScrollContainer).

## הפתרון

### 1. שינויים ב-`MVP/web/index.html`
```css
/* לפני: */
body {
  overflow-y: auto;
}

/* אחרי: */
html {
  overflow: hidden;
}

body {
  overflow: hidden;
}

#root {
  max-height: 100vh;
  overflow: hidden;
}
```

זה מאלץ את הגלילה לעבור לקומפוננטים הפנימיים במקום להישאר ברמת ה-body.

### 2. הוספת `nestedScrollEnabled` למסכים
הוספתי `scrollEnabled={true}` ו-`nestedScrollEnabled={true}` לכל ה-FlatList וה-ScrollView במסכים הבעייתיים:
- `MVP/screens/DiscoverPeopleScreen.tsx`
- `MVP/screens/NotificationsScreen.tsx`
- `MVP/screens/NewChatScreen.tsx`
- `MVP/screens/AdminCRMScreen.tsx`

### 3. שיפור styles ל-FlatList
הוספתי overflow styles ל-FlatList ב-DiscoverPeopleScreen:
```typescript
flatList: {
  flex: 1,
  ...(Platform.OS === 'web' && {
    overflow: 'auto' as any,
    WebkitOverflowScrolling: 'touch' as any,
  }),
}
```

## בדיקה
1. הרץ build חדש:
   ```bash
   cd MVP
   npm run build
   ```

2. העלה לפרודקשן ב-Railway:
   ```bash
   git add .
   git commit -m "fix: web scrolling in production"
   git push origin dev  # או main, בהתאם לענף
   ```

3. בדוק את המסכים הבעייתיים באתר:
   - פתח את האפליקציה מהדומיין של Railway
   - נווט למסכים הבעייתיים
   - ודא שהגלילה עובדת כראוי

## למה זה עבד במקומי אבל לא בפרודקשן?
בפיתוח מקומי, יש dev server שעשוי להתנהג אחרת או להוסיף styles נוספים. בפרודקשן, הקבצים מוגשים כ-static files דרך nginx/server, והבעיה מתגלה יותר בבירור.

## הערות נוספות
- ScrollContainer כבר היה מוגדר נכון עם `overflowY: 'auto'` ו-`height: '100%'`, אז מסכים שהשתמשו בו (כמו ChatListScreen) אמורים לעבוד אחרי תיקון ה-HTML.
- מסכים שהשתמשו ב-ScrollView רגיל (כמו SettingsScreen) לא היו מושפעים מהבעיה כי ScrollView מטפל בגלילה אחרת מ-FlatList.

---

**תאריך:** 27.12.2025
**גרסה:** 1.0.0





