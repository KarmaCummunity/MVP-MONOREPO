# Correcting user identification problems (User ID Resolution)

## The problem

There were two main problems with the API tests:

1. **Community Stats Test** - Error: `column "roles" does not exist`
2. **Chat Conversations Test** - Error: `column "google_id" does not exist`

## the reason

The code attempted to access `google_id` and `roles` columns that did not exist in the local database.

## The solution

### 1. Code update - only using UUID

We updated the code so that it uses **only the UUID we create** (`user_profiles.id`) to identify users:

**Updated files:**
- ✅ `src/services/user-resolution.service.ts` - we removed `google_id` from the query
- ✅ `src/controllers/community-members.controller.ts` - We removed `google_id`
- ✅ `src/controllers/rides.controller.ts` - We removed `google_id`

**Supported identifiers for user identification:**
- ✅ UUID (user_profiles.id) - **the primary identifier**
- ✅ Email
- ✅ Firebase UID (only for linking with Firebase Auth)
- ❌ Google ID - **no longer used**

### 2. Migration - adding missing columns

We created a migration that adds the missing columns if they don't exist:

```bash
# Run the migration manually:
./scripts/run-column-migration.sh
```

**or** - the migration will run automatically when you run:
```bash
cd ../MVP
./scripts/run-local-e2e.sh
```

## Why did we keep the `google_id` column?

Although we do not use `google_id' to identify users, **the column remains in the table** for the purposes of:
- Historical documentation
- Possible future use
- Backwards compatibility

**But** - we **don't use it to identify users**. The unique identifier is `user_profiles.id` (UUID).

## test

After running the migration, run the tests:

```bash
cd ../MVP
./scripts/run-local-e2e.sh
```

The following tests should be passed:
- ✅ Community Stats
- ✅ Chat Conversations
- ✅ Donation Stats
- ✅ Notifications
- ✅ Redis Comprehensive

## Files created/updated

1. `src/database/migration-ensure-columns.sql` - migration to add columns
2. `scripts/run-column-migration.sh` - script to run the migration
3. `src/services/user-resolution.service.ts` - updated to remove `google_id`
4. `src/controllers/community-members.controller.ts` - updated to remove `google_id`
5. `src/controllers/rides.controller.ts` - updated to remove `google_id`

## An important principle

**We only use the UUID we create (`user_profiles.id`) to identify users throughout the system.**

External identifiers (Firebase UID, Google ID) are **only** used for linking with external authentication providers, but not for internal identification in the system.