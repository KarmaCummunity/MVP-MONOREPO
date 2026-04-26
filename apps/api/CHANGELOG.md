# Changelog

## [2.5.0] - 2025-12-24

### Added
- **Automatic script for copying data from Production to Development**
  - `scripts/copy-prod-to-dev.sh` - main script that performs the whole process automatically
  - `scripts/setup-db-urls.sh` - an interactive script for setting up database URLs
  - `src/scripts/verify-import.ts` - Detailed verification script
  - Adding npm scripts: `data:copy-prod-to-dev`, `data:setup-urls`, `data:verify`
  - Detailed documentation in `COPY_DATA_QUICK_START.md`

### Features
1. **Automatic export** - exports all tables from production (49 tables)
2. **Anonymization** - Automatically masks emails and phone numbers
3. **Backup** - Saves a backup of development before replacement
4. **Smart import** - Imports the data with per-row error handling
5. **Verification** - verifies that everything worked and displays detailed statistics

### Improvements
- **import script correction:**
  - Checking if a table exists before TRUNCATE
  - Handling per-row errors instead of failing on the first row
  - Detailed report on skipped lines (UUID vs Firebase UID mismatches)
  
### Safety Features
- Direction check - makes sure that copies prod→dev and not the other way around
- server detection - detects if the URLs change (ballast vs caboose)
- User authorization - requests explicit authorization before starting
- Automatic backup - saves the development before replacing
- Anonymization - protects user privacy

### Test Results
✅ **First successful run:**
- 1,797 lines were copied successfully
- 33 users, 1,583 community statistics, 14 contributions, 18 trips
- Anonymization worked great
- Backup created (336KB)
- Detailed results in `DATA_COPY_SUCCESS.md`

### Usage
```bash
# Setting URLs (first time)
source ./scripts/setup-db-urls.sh

# Full copy
./scripts/copy-prod-to-dev.sh

# or via npm
npm run data:copy-prod-to-dev

# Authentication only
npm run data:verify
```

### Options
- `--skip-backup` - skip development backup
- `--skip-anonymize` - skipping anonymization (not recommended!)

### Known Issues
- Some lines were omitted due to UUID vs Firebase UID mismatches
- Legacy tables (`users`, `chats`, `messages`) do not exist in development
- Solution: the script skips problematic lines and reports them

---

## [1.7.7] - 2025-12-24

### Fixed
- **Critical fix: Foreign Key Constraints error in Posts tables**
  - We solved an error that caused the server to crash in Railway-dev: `column "id" referenced in foreign key constraint does not exist`
  - The error occurred when old tables (`posts`, `post_comments`) existed in a structure different from the required structure
  - The fix: We changed the checks for the existence of the tables in 3 blocks of `DO $$` to be more comprehensive

### Technical Details - Foreign Key Validation
Instead of just checking that the table exists:
```sql
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
```

Now we also check that the specific column exists:
```sql
IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'id'
) THEN
```

### Blocks Updated
1. **post_likes foreign keys** (schema.sql:595-622)
   - `post_likes.post_id` → `posts(id)`
   - `post_likes.user_id` → `user_profiles(id)`

2. **post_comments foreign keys** (schema.sql:641-668)
   - `post_comments.post_id` → `posts(id)`
   - `post_comments.user_id` → `user_profiles(id)`

3. **comment_likes foreign keys** (schema.sql:692-719)
   - `comment_likes.comment_id` → `post_comments(id)`
   - `comment_likes.user_id` → `user_profiles(id)`

### Impact
- ✅ The server goes up successfully in Railway-dev even when there are old tables
- ✅ Prevents foreign key constraint errors in the future
- ✅ Backwards compatible - works both with an empty database and with an existing database
- ✅ No deletion of existing data - only skipping adding constraints if the structure is not correct

### Prevention Strategy
The fix prevents similar problems in the future by:
1. A more detailed examination of the structure of the tables before adding constraints
2. Detailed documentation in the code comments about the reason for these tests
3. "fail-safe" approach - if the structure is not in order, jump instead of falling

---

## [1.7.6] - 2025-11-23

### Fixed
- **Fixing TypeScript errors in the Challenges controller:** Fixed compilation errors in `challenges.controller.ts`
  - We added default values to required properties in DTOs
  - Fixed issues with `strictPropertyInitialization` in TypeScript
  - The errors that were corrected: `Property 'X' has no initializer and is not definitely assigned in the constructor`

### Technical Details
- We changed the property definition in DTOs from `name!: string` to `name: string = ''`
- This allows TypeScript in strict settings to compile successfully while maintaining identical behavior### Classes Updated
- `CreateChallengeDto`
- `CreateResetLogDto`
- `CreateRecordBreakDto`

---

## [1.7.5] - 2025-11-23

### Fixed
- **Saving site visit data:** We added `site_visits` to the initial statistics list to avoid resetting when updating the server
- **Data Persistence:** We improved the data saving mechanism in Railway with comments and detailed log messages

### Added
- We added detailed log messages (`✨ Created` / ` ✅ Preserved`) to track the saving of statistics
- We added comments in the code explaining the ``ON CONFLICT DO NOTHING'' mechanism
- Added documentation:
  - `RAILWAY_DATA_PERSISTENCE.md` - a detailed guide to saving data in Railway
  - Updating `RAILWAY.md` with a section on Data Persistence

### Technical Details
- In the `src/database/database.init.ts` file:
  - We added `site_visits` to the `defaultStats` list
  - Improved console.log messages to distinguish between creating new stats and saving existing ones
  - We added `RETURNING' to the query to know if the data was created or saved

### Notes
- The change ensures that `site_visits` and the other statistics **will not be reset** when updating the server in Railway
- The data is saved using `ON CONFLICT (stat_type, city, date_period) DO NOTHING`
- **Important:** Make sure the server is connected to Railway's Postgres Plugin and not to a temporary database

---

## [1.7.4] - First
- previous version