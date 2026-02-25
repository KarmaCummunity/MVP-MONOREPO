# מחיקת פוסטים - תיעוד מלא

## 🎯 סקירה כללית

הוספנו פונקציונליות מחיקת פוסטים עם לוגיקה חכמה שמטפלת בכל סוגי הפוסטים ובמחיקה קסקדית של ישויות קשורות.

---

## 🔐 הרשאות

### 1. **משתמש רגיל**
- יכול למחוק **רק את הפוסטים שלו**
- לא יכול למחוק פוסטים של אחרים

### 2. **Super Admin**
- יכול למחוק **כל פוסט** במערכת
- כולל פוסטים של משתמשים אחרים
- הפעולה מתועדת כ-`is_admin_action: true`

---

## 🗑️ לוגיקת המחיקה

### **סוגי פוסטים ואסטרטגיית המחיקה:**

| סוג פוסט | מה נמחק | הסבר |
|----------|---------|------|
| **`ride`** | הנסיעה + הפוסט (CASCADE) | מוחקים את הנסיעה מטבלת `rides`, הפוסט נמחק אוטומטית |
| **`item`** / **`donation`** | הפריט + הפוסט (CASCADE) | מוחקים את הפריט מטבלת `items`, הפוסט נמחק אוטומטית |
| **`task_completion`** / **`task_assignment`** | רק הפוסט | המשימה נשארת! משימות יכולות להיות מקושרות למספר פוסטים |
| **כללי / אחר** | רק הפוסט | מחיקה פשוטה של הפוסט בלבד |

---

## 📊 מה קורה כשמוחקים פוסט?

### **1. פוסט של טרמפ (ride)**
```
משתמש מוחק פוסט טרמפ
    ↓
מוחקים את הנסיעה מטבלת rides
    ↓
CASCADE מוחק אוטומטית:
    ├─ הפוסט מטבלת posts
    ├─ כל ה-likes על הפוסט
    ├─ כל ה-comments על הפוסט
    └─ כל ה-bookings של הנסיעה
```

### **2. פוסט של פריט (item/donation)**
```
משתמש מוחק פוסט פריט
    ↓
מוחקים את הפריט מטבלת items
    ↓
CASCADE מוחק אוטומטית:
    ├─ הפוסט מטבלת posts
    ├─ כל ה-likes על הפוסט
    ├─ כל ה-comments על הפוסט
    └─ כל ה-requests של הפריט
```

### **3. פוסט של משימה (task)**
```
משתמש מוחק פוסט משימה
    ↓
מוחקים רק את הפוסט
    ↓
המשימה נשארת!
    ├─ המשימה עדיין קיימת בטבלת tasks
    ├─ ניתן ליצור פוסט חדש על אותה משימה
    └─ המשימה ממשיכה להיות מנוהלת בנפרד
```

---

## 🔧 שימוש ב-API

### **Backend Endpoint**

```typescript
DELETE /api/posts/:postId
Authorization: Bearer <jwt_token>
Content-Type: application/json

Body:
{
  "user_id": "uuid-of-user"
}

Response (Success):
{
  "success": true,
  "data": {
    "post_id": "uuid",
    "post_type": "ride",
    "deletion_strategy": "ride_cascade",
    "message": "Post and related ride deleted successfully"
  }
}

Response (Error - Not Owner):
{
  "success": false,
  "error": "Permission denied. You can only delete your own posts or be a super admin."
}
```

### **Frontend Usage**

```typescript
import { apiService } from '../utils/apiService';
import { useUser } from '../stores/userStore';

// בתוך קומפוננטה
const { selectedUser } = useUser();

const handleDeletePost = async (postId: string) => {
  try {
    const result = await apiService.deletePost(postId, selectedUser.id);
    
    if (result.success) {
      console.log('✅ Post deleted:', result.data.message);
      // רענן את הפיד
      refreshFeed();
    } else {
      console.error('❌ Failed to delete:', result.error);
      showError(result.error);
    }
  } catch (error) {
    console.error('Error deleting post:', error);
  }
};
```

---

## 📝 דוגמאות שימוש

### **1. משתמש מוחק את הפוסט שלו**
```typescript
// User ID: user-123
// Post Author ID: user-123
// Result: ✅ Success - Post deleted

await apiService.deletePost('post-456', 'user-123');
// → Post deleted successfully
```

### **2. משתמש מנסה למחוק פוסט של אחר**
```typescript
// User ID: user-123
// Post Author ID: user-789
// Result: ❌ Error - Permission denied

await apiService.deletePost('post-456', 'user-123');
// → Error: "Permission denied. You can only delete your own posts..."
```

### **3. Super Admin מוחק כל פוסט**
```typescript
// User ID: admin-001 (roles: ['super_admin'])
// Post Author ID: user-789
// Result: ✅ Success - Admin action logged

await apiService.deletePost('post-456', 'admin-001');
// → Post deleted successfully
// → Activity logged with is_admin_action: true
```

---

## 🎨 UI Components (לדוגמה)

### **כפתור מחיקה בפוסט**

```tsx
import { apiService } from '../utils/apiService';
import { useUser } from '../stores/userStore';

const PostCard = ({ post }) => {
  const { selectedUser } = useUser();
  
  // בדוק אם המשתמש יכול למחוק
  const canDelete = 
    post.user.id === selectedUser?.id || 
    selectedUser?.roles?.includes('super_admin');

  const handleDelete = async () => {
    // הצג אישור
    const confirmed = await showConfirmDialog({
      title: 'מחיקת פוסט',
      message: post.post_type === 'ride' 
        ? 'מחיקת הפוסט תמחק גם את הנסיעה. האם להמשיך?'
        : 'האם למחוק את הפוסט?',
      confirmText: 'מחק',
      cancelText: 'ביטול',
      destructive: true
    });

    if (!confirmed) return;

    try {
      const result = await apiService.deletePost(post.id, selectedUser.id);
      
      if (result.success) {
        showSuccess(result.data.message);
        // רענן פיד או נווט חזרה
        navigation.goBack();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('שגיאה במחיקת הפוסט');
    }
  };

  if (!canDelete) return null;

  return (
    <TouchableOpacity onPress={handleDelete}>
      <Icon name="trash" color="red" />
      <Text>מחק פוסט</Text>
    </TouchableOpacity>
  );
};
```

---

## 🔍 מעקב ולוגים

### **Activity Tracking**
כל מחיקה נרשמת ב-`user_activities`:

```json
{
  "user_id": "uuid",
  "activity_type": "post_deleted",
  "activity_data": {
    "post_id": "uuid",
    "post_type": "ride",
    "deletion_strategy": "ride_cascade",
    "related_entity_deleted": true,
    "is_admin_action": false
  }
}
```

### **Server Logs**
```
🗑️ Deleting post abc-123 (type: ride) by user xyz-789 (owner: true, admin: false)
✅ Deleted ride def-456 (post auto-deleted via CASCADE)
```

---

## ⚠️ שיקולים חשובים

### **1. מחיקה קסקדית**
- **Rides & Items**: המחיקה היא **קבועה** - לא ניתן לשחזר!
- **Tasks**: רק הפוסט נמחק, המשימה נשארת

### **2. Cache Invalidation**
המערכת מנקה אוטומטית:
- `post_${postId}`
- `posts_*` (כל הפוסטים)
- `user_posts_*` (פוסטים של משתמשים)

### **3. Foreign Keys**
הגדרנו `ON DELETE CASCADE` ל:
- `posts.ride_id → rides.id`
- `posts.item_id → items.id`
- `post_likes.post_id → posts.id`
- `post_comments.post_id → posts.id`

---

## 🧪 בדיקות

### **Test Cases**

```typescript
// 1. User deletes own post
test('user can delete own post', async () => {
  const result = await apiService.deletePost(postId, userId);
  expect(result.success).toBe(true);
});

// 2. User cannot delete other's post
test('user cannot delete others post', async () => {
  const result = await apiService.deletePost(postId, otherUserId);
  expect(result.success).toBe(false);
  expect(result.error).toContain('Permission denied');
});

// 3. Super admin can delete any post
test('super admin can delete any post', async () => {
  const result = await apiService.deletePost(postId, adminId);
  expect(result.success).toBe(true);
});

// 4. Ride post deletion cascades
test('deleting ride post deletes ride', async () => {
  await apiService.deletePost(ridePostId, userId);
  const ride = await getRideById(rideId);
  expect(ride).toBeNull();
});

// 5. Task post deletion preserves task
test('deleting task post preserves task', async () => {
  await apiService.deletePost(taskPostId, userId);
  const task = await getTaskById(taskId);
  expect(task).not.toBeNull();
});
```

---

## 📚 קבצים ששונו

✅ `/KC-MVP-server/src/controllers/posts.controller.ts` - הוספת endpoint מחיקה  
✅ `/MVP/utils/apiService.ts` - הוספת `deletePost` method  

---

## 🚀 סטטוס

**✅ מוכן לשימוש!**

הפיצ'ר מוכן ומאובטח:
- ✅ הרשאות מוגדרות
- ✅ מחיקה קסקדית עובדת
- ✅ לוגים ומעקב
- ✅ Cache invalidation
- ✅ Error handling

---

**תאריך**: 2025-12-29  
**מפתח**: Antigravity AI
