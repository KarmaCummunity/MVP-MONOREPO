# תוכנית הבראה (Recovery Plan) - MVP White Screen Fix

## 1. סיכום מצב נוכחי
חזרנו (Hard Revert) לקומיט היציב האחרון: **`209de97`** ("fix sub tsak and try fix scrolling").
בגרסה זו:
- האתר עולה תקין (אין מסך לבן).
- אין את הסקריפט ההרסני (`fix-scroll-html.sh`).
- חסרים הפיצ'רים החדשים שפותחו ב-"improve admain deshborad".

## 2. ניתוח השינויים ("הדלתא")
הקומיט הבעייתי (`6ab7ef8`) הכיל 5 קבוצות שינויים עיקריות (מעל 3,000 שורות קוד):

### א. מערכת טבלאות ניהול דינמיות (Admin Tables)
*   **קבצים**: `screens/AdminTablesScreen.tsx`, `screens/AdminTableRowsScreen.tsx`
*   **מהות**: צפייה ועריכה של טבלאות בסיס נתונים ישירות מהאדמין.

### ב. ניהול זמן ומשימות (Time Management)
*   **קבצים**: `screens/AdminTimeManagementScreen.tsx`, `components/TaskHoursModal.tsx`, `screens/AdminTasksScreen.tsx`
*   **מהות**: דיווח שעות, מודאל שעות, ושיפורים במסך משימות.

### ג. דאשבורד והיררכיה (Dashboard & Hierarchy)
*   **קבצים**: `screens/AdminDashboardScreen.tsx`, `components/AdminHierarchyTree.tsx`, `screens/LandingSiteScreen.tsx`
*   **מהות**: עיצוב מחדש של הדאשבורד, הוספת עץ מנהלים ויזואלי.

### ד. ניהול קבצים וצ'אט (Files & Chat)
*   **קבצים**: `screens/AdminFilesScreen.tsx`, `screens/ChatDetailScreen.tsx`
*   **מהות**: שיפורים בממשק הקבצים וטיפול בצ'אט.

### ה. תשתיות ושונות (Infra)
*   **קבצים**: `utils/storageService.ts`, `utils/apiService.ts`, `scripts/fix-scroll-html.sh`
*   **מהות**: שירות אחסון חדש, עדכוני API וסקריפט התיקון (שגרם לתקלה).

---

## 3. תוכנית עבודה מדורגת (Re-integration Plan)
נחזיר את הפיצ'רים אחד-אחד, נבדוק שכל אחד עובד ואינו "שובר" את האתר.

### שלב 1: תשתיות (ללא הסקריפט הבעייתי)
- [ ] החזרת `utils/storageService.ts` ו-`utils/apiService.ts`.
- [ ] **דילוג** על `scripts/fix-scroll-html.sh`!
- [ ] בדיקת Build.

### שלב 2: ניהול זמן ומשימות
- [ ] החזרת `AdminTimeManagementScreen`, `TaskHoursModal`.
- [ ] עדכון `AdminTasksScreen`.
- [ ] עדכון הראוטר (`MainNavigator` / `AdminStack`).
- [ ] בדיקה.

### שלב 3: טבלאות ניהול
- [ ] החזרת `AdminTablesScreen`, `AdminTableRowsScreen`.
- [ ] עדכון הראוטר.
- [ ] בדיקה.

### שלב 4: צ'אט וקבצים
- [ ] החזרת השינויים ב-`AdminFilesScreen` ו-`ChatDetailScreen`.
- [ ] בדיקה.

### שלב 5: דאשבורד והיררכיה (החלק הרגיש)
- [ ] החזרת `AdminHierarchyTree` ועדכון `AdminDashboardScreen`.
- [ ] וידוא שאין שינויי Layout ששוברים את הגלילה או ה-App Root.
- [ ] בדיקה סופית.

---
**הערה חשובה**: כל שלב ילווה ב-Deploy ובדיקה שהמסך אינו לבן.
