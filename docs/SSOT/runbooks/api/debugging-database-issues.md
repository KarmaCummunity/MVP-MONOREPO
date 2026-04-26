# Guide to checking table structure problems

## What does this mean?

The message "Database table structure issue" appears when there is a problem with the table structure in the database. It can be:
- A column is missing in the table
- Table does not exist
- Problem with indexes

## How to check what the problem is?

### 1. Checking the server logs

The exact error appears in the server logs. Check out:

**In Railway:**
1. Go to Railway Dashboard
2. Select the project
3. Click on "Deployments" or "Logs"
4. Look for errors with the words: `does not exist`, `column`, `table`

**blockly:**
```bash
cd KC-MVP-server
# If the server is running, you will see the errors in the console
# Or check the logs:
tail -f server-output.log
```

### 2. Checking the table structure directly

**Using SQLTools (recommended):**
1. Open SQLTools in VSCode
2. Connect to the database
3. Run the following query:

```sql
-- Check if the tasks table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'tasks'
) AS tasks_table_exists;

-- Check the columns in the tasks table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Check for missing columns
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'title') THEN 'title is missing'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN 'status is missing'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority') THEN 'priority is missing'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assignees') THEN 'assignees is missing'
        ELSE 'All columns exist'
    END AS missing_columns;
```

### 3. React error checking

The errors in the browser console:
- **React error #418**: Minified React error - open the code in dev mode to see the full error
- **Cross-Origin-Opener-Policy**: Browser security issue - not critical, but can cause problems

### 4. Correcting the problem

If there are any missing columns, run the migration:

```sql
-- Run schema.sql again
-- or run a specific migration:
\i src/database/migration-fix-schema-sync.sql
```

## Useful queries for testing

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check all the columns in the tasks table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- Check all indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tasks';
```

## Important logs to check

Check the server logs for:
- ``Error listing tasks:''
- ``does not exist''
- `column`
- ``Schema creation failed''