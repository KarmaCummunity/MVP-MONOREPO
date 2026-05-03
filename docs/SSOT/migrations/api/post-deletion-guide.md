# Deleting posts - full documentation

## 🎯 Overview

We added post deletion functionality with smart logic that handles all types of posts and cascading deletion of related entities.

---

## 🔐 Permissions

### 1. **regular user**
- can delete **only his own posts**
- Can't delete other people's posts

### 2. **Super Admin**
- Can delete **any post** in the system
- Includes posts from other users
- The action is documented as `is_admin_action: true`

---

## 🗑️ The deletion logic

### **Types of posts and the deletion strategy:**

| Post Type | What was deleted | Explanation |
|----------|---------|------|
| **`ride`** | The trip + the post (CASCADE) | Delete the ride from the `rides' table, the post is automatically deleted
| **`item`** / **`donation`** | The item + the post (CASCADE) | Delete the item from the `items` table, the post is automatically deleted
| **`task_completion`** / **`task_assignment`** | Just the post The mission remains! Tasks can be linked to multiple posts
| **General / Other** | Just the post Simple deletion of the post only

---

## 📊 What happens when you delete a post?

### **1. Ride post**
```
A user deletes a tramp post
    ↓
Delete the ride from the rides table
    ↓
CASCADE automatically deletes:
    ├─ The post from the posts table
    ├─ All the likes on the post
    ├─ All the comments on the post
    └─ All bookings of the trip
```

### **2. Post of an item (item/donation)**
```
A user deletes a post item
    ↓
Delete the item from the items table
    ↓
CASCADE automatically deletes:
    ├─ The post from the posts table
    ├─ All the likes on the post
    ├─ All the comments on the post
    └─ All item requests
```

### **3. Task post**
```
A user deletes a task post
    ↓
Only the post is deleted
    ↓
The mission remains!
    ├─ The task still exists in the tasks table
    ├─ You can create a new post about the same task
    └─ The task continues to be managed separately
```

---

## 🔧 API usage

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

// inside a component
const { selectedUser } = useUser();

const handleDeletePost = async (postId: string) => {
  try {
    const result = await apiService.deletePost(postId, selectedUser.id);
    
    if (result.success) {
      console.log(' ✅ Post deleted:', result.data.message);
      // refresh the feed
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

## 📝 Examples of use

### **1. User deletes his post**
```typescript
// User ID: user-123
// Post Author ID: user-123
// Result: ✅ Success - Post deleted

await apiService.deletePost('post-456', 'user-123');
// → Post deleted successfully
```

### **2. A user is trying to delete another's post**
```typescript
// User ID: user-123
// Post Author ID: user-789
// Result: ❌ Error - Permission denied

await apiService.deletePost('post-456', 'user-123');
// → Error: "Permission denied. You can only delete your own posts..."
```

### **3. Super Admin deletes every post**
```typescript
// User ID: admin-001 (roles: ['super_admin'])
// Post Author ID: user-789
// Result: ✅ Success - Admin action logged

await apiService.deletePost('post-456', 'admin-001');
// → Post deleted successfully
// → Activity logged with is_admin_action: true
```

---

## 🎨 UI Components (for example)

### **Delete button in the post**

```tsx
import { apiService } from '../utils/apiService';
import { useUser } from '../stores/userStore';

const PostCard = ({ post }) => {
  const { selectedUser } = useUser();
  
  // Check if the user can delete
  const canDelete = 
    post.user.id === selectedUser?.id || 
    selectedUser?.roles?.includes('super_admin');if (!confirmed) return;

    try {
      const result = await apiService.deletePost(post.id, selectedUser.id);
      
      if (result.success) {
        showSuccess(result.data.message);
        // refresh feed or navigate back
        navigation.goBack();
      } else {
        showError(result.error);
      }
    } catch (error) {
      showError('Error deleting the post');
    }
  };

  if (!canDelete) return null;

  return (
    <TouchableOpacity onPress={handleDelete}>
      <Icon name="trash" color="red" />
      <Text>Delete post</Text>
    </TouchableOpacity>
  );
};
```

---

## 🔍 Tracking and logging

### **Activity Tracking**
Each deletion is recorded in `user_activities`:

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

## ⚠️ Important considerations

### **1. cascading deletion**
- **Rides & Items**: The deletion is **permanent** - cannot be restored!
- **Tasks**: only the post is deleted, the task remains

### **2. Cache Invalidation**
The system automatically cleans:
- `post_${postId}`
- `posts_*` (all posts)
- `user_posts_*` (user posts)

### **3. Foreign Keys**
We defined `ON DELETE CASCADE` to:
- `posts.ride_id → rides.id`
- `posts.item_id → items.id`
- `post_likes.post_id → posts.id`
- `post_comments.post_id → posts.id`

---

## 🧪 tests

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

## 📚 Modified files

✅ `/KC-MVP-server/src/controllers/posts.controller.ts` - adding a deletion endpoint  
✅ `/MVP/utils/apiService.ts` - added `deletePost` method  

---

## 🚀 Status

** ✅ Ready to use!**

The feature is ready and secure:
- ✅ Defined permissions
- ✅ Cascading deletion works
- ✅ Logs and tracking
- ✅ Cache invalidation
- ✅ Error handling

---

**Date**: 2025-12-29  
**Key**: Antigravity AI