# Full scan report - user and identifier mechanism

## Date: 2025-12-18

## Summary of critical issues

### 1. UUID issues in items-delivery.service.ts

**Location**: `src/controllers/items-delivery.service.ts`

**Problems**:
- line 117, 158: wrong comments - "owner_id is TEXT containing Firebase UIDs" - but table converted to UUID!
- Line 164: `LEFT JOIN user_profiles up ON up.firebase_uid = i.owner_id` - should be `up.id = i.owner_id`
- line 210: wrong comment - "items.owner_id contains Firebase UIDs (TEXT)"
- line 234: uses firebaseUid instead of UUID
- line 478: there is a correct use of `up_owner.id = i.owner_id` but inconsistent

**IMPACT**: UUID error when receiving Firebase UID as owner_id

---

### 2. JSONB tables with user_id TEXT instead of UUID

**Location**: `src/scripts/init-db.ts` lines 79-121

**Tables that need to be converted**:
- users (duplicate - should be deleted!)
- posts
- followers
- following
- chats
- messages
- notifications
- bookmarks
- settings
- media
- blocked_users
- message_reactions
- typing_status
- read_receipts
- voice_messages
- conversation_metadata
- organizations
- org_applications
- links (must be deleted!)

**Problem**: All these tables are created with `user_id TEXT NOT NULL` instead of `user_id UUID`

**IMPACT**: Incompatibility with user_profiles.id (UUID)

---

### 3. Double tables

**Tables that need to be deleted**:
1. **users** - duplicates of `user_profiles`
   - is created in `init-db.ts` line 94
   - should not exist according to schema.sql line 45

2. **links** - deleted according to UNIFICATION_SUMMARY
   - is created in `init-db.ts` line 114
   - should not exist according to schema.sql line 47

---

### 4. Using email/firebase_uid instead of UUID

**Places that use email/firebase_uid to identify users**:

1. **items-delivery.service.ts**:
   - Line 48: `WHERE LOWER(email) = LOWER($1)`
   - line 210-240: tries to resolve owner_id to firebase_uid instead of UUID

2. **users.controller.ts**:
   - Lines 55, 166, 335: use of email for identification
   - This is correct - email should be supported for identification, but converted to UUID

3. **auth.controller.ts**:
   - lines 154, 270, 327, 432, 642, 653: use of email
   - This is correct - you need to support email for identification

4. **sync.controller.ts**:
   - Lines 106, 331: Using email/firebase_uid
   - It's normal

5. **rides.controller.ts**:
   - Lines 54, 310: use of email
   - It's normal

6. **tasks.controller.ts**:
   - Line 46: Use of email
   - It's normal

7. **chat.controller.ts**:
   - Line 46: Use of email
   - It's normal

**Note**: Using email/firebase_uid for identification is correct, but needs to be converted to UUID before using queries.

---

### 5. Additional problems

#### 5.1. items.service.ts
- line 168: `WHERE user_id = $1` - USER user_id TEXT
- You need to check if the tables have been converted to UUID

#### 5.2. challenges.controller.ts
- Lines 351, 420: `challenge.user_id`, `deleted.user_id`
- You need to check the structure of the table

#### 5.3. item_requests
- line 431 in items-delivery.service.ts: `itemCheck.rows[0].owner_id === createRequestDto.requester_id`
- You need to check if it is UUID or TEXT

---

## Summary of problems in order of priority

### Critical (must fix immediately):
1. ✅ Repair items.owner_id in items-delivery.service.ts - change from firebase_uid to id
2. ✅ Convert JSONB tables from user_id TEXT to UUID
3. ✅ Removing duplicate tables (users, links)

### Important (should be fixed soon):
4. ✅ update init-db.ts - change baseTable to UUID
5. ✅ Creating a migration script to convert existing data
6. ✅ Update all code that uses JSONB tables

### Medium (check and correct):
7. ✅ Check items.service.ts - have the tables been converted
8. ✅ Testing challenges - the structure of the table
9. ✅ Checking item_requests - types of identifiers

---

## Recommendations

1. **Perform a full migration** - convert all tables to UUID at once
2. **update init-db.ts** - prevent creating tables with TEXT
3. **check all queries** - make sure they use the UUID
4. **check all joins** - make sure they use UUID
5. **clean duplicate tables** - delete users and links

---

## Files that need to be updated

### Server:
1. `src/controllers/items-delivery.service.ts` - fix owner_id queries
2. `src/scripts/init-db.ts` - Convert user_id to UUID
3. `src/items/items.service.ts` - test and update
4. `src/database/schema.sql` - verification that all tables are correct
5. Creating `src/database/migration-jsonb-to-uuid.sql` - migration script

### tests:
- check all the controllers that use user_id
- Check all services that use user_id
- Check all queries that use joins