# Instructions for running a migration - hierarchy of permissions

## ⚠️ Very important

**The migration must run before the feature will work fully!**

Currently the code works with fallback (without `hierarchy_level`), but for everything to work correctly, you need to run the migration.

## Steps to run the migration

### 1. DB backup (mandatory!)
```bash
# Back up the DB before the migration!
pg_dump -d your_database_name > backup_before_hierarchy_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Checking that the migration is correct
```bash
# Check that the file exists
ls -la KC-MVP-server/migrations/add-hierarchy-levels.sql
```

### 3. Running the migration on a test DB
```bash
# Run on a test DB first!
psql -d your_test_database -f KC-MVP-server/migrations/add-hierarchy-levels.sql
```

### 4. Checking that the migration worked
```sql
-- Check that the column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'hierarchy_level';

-- Check that the principal is correct
SELECT email, hierarchy_level, parent_manager_id 
FROM user_profiles 
WHERE email = 'karmacommunity2.0@gmail.com';
-- expected: hierarchy_level = 0, parent_manager_id = NULL

-- Check that super managers are correct
SELECT email, hierarchy_level, parent_manager_id 
FROM user_profiles 
WHERE email IN ('navesarussi@gmail.com', 'mahalalel100@gmail.com');
-- expected: hierarchy_level = 1, parent_manager_id = id of karmacommunity2.0@gmail.com
```

### 5. Only after a successful test - lecture on production
```bash
# ⚠️ Only after you have checked on the test DB!
psql -d your_production_database -f KC-MVP-server/migrations/add-hierarchy-levels.sql
```

## What does migration do?

1. **adds `hierarchy_level' column** - level in the hierarchy
2. **Creates `user_hierarchy_history` table** - change history
3. **Creates function `calculate_hierarchy_level()`** - automatic rank calculation
4. **creates trigger `update_hierarchy_level()`** - automatic update
5. **defines primary grades**:
   - Rank 0: `karmacommunity2.0@gmail.com` (Chief Admin)
   - Level 1: `navesarussi@gmail.com`, `mahalalel100@gmail.com`
   - The rest of the users: `hierarchy_level = NULL`

## What happens if I don't run the migration?

- The code will work with fallback (without `hierarchy_level`)
- You will not see ranks in the UI
- You will not see a "volunteers" tab
- The feature will not work fully

## What happens after running the migration?

- ✅ You will see ranks in the UI
- ✅ Look at the "Volunteers" tab
- ✅ The main manager is always `parent_manager_id = NULL`
- ✅ All changes are saved in history
- ✅ Grades are automatically calculated

## Common problems

### Error: "column hierarchy_level does not exist"
**Solution**: The migration did not run. Run it according to the instructions above.

### Error: "relation user_hierarchy_history does not exist"
**Solution**: The migration did not run. Run it according to the instructions above.

### The main manager still reports to someone
**Solution**: Run the migration - it will fix it automatically.

---

**Ready to run?** Start with a backup DB and then run on a test DB!