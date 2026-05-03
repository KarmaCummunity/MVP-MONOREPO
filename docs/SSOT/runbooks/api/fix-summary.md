# Fix summary: saving site visit data

## The problem
The site visit data was reset every time the server was updated on Railway.

## the reason
The `site_visits` statistic was not in the initial statistics list, so every time the server was rebooted, it was only generated when someone visited the site.

## The implemented solution

### 1. Code (Code Changes)

#### File: `src/database/database.init.ts`
- ✅ We added `site_visits` to the initial statistics list
- ✅ We have added detailed comments explaining the ``ON CONFLICT DO NOTHING'' mechanism
- ✅ We added detailed logs: "✨ Created" when a new figure is created, " ✅ Preserved" when an existing figure is saved

#### File: `package.json`
- ✅ We updated the version to 1.7.5
- ✅ We added a `copy:schema` script that copies the SQL files to the dist folder
- ✅ We improved the `build` script to run `copy:schema` automatically

### 2. Documentation

#### New file: `RAILWAY_DATA_PERSISTENCE.md`
A detailed guide that includes:
- Explanation of the problem and the reason
- Step-by-step instructions to ensure data storage in Railway
- Technical explanation of how the visit mechanism works
- Solutions to common problems
- Examples and code

#### File: `RAILWAY.md` (updated)
- ✅ We added a section "⚠️ Important: permanent data saving"
- ✅ Quick instructions for testing a connection to the Postgres Plugin
- ✅ List of common problems and solutions

#### New file: `CHANGELOG.md`
- Detailed documentation of the changes in version 1.7.5
- Technical explanation of what is different and why

### 3. How it works now

#### Before the repair:
```
1. The server is started → the community_stats table is created
2. defaultStats does not include site_visits
3. First visit to the site → site_visits is created with a value of 1
4. Additional visits → site_visits increases: 2, 3, 4...
5. Update the server → reboot
6. defaultStats does not include site_visits → site_visits is not created
7. First visit after update → site_visits created with value 1 ❌
```

#### After the repair:
```
1. The server is started → the community_stats table is created
2. defaultStats includes site_visits with a value of 0
3. If site_visits does not exist → created with 0
4. If site_visits exists → saved (ON CONFLICT DO NOTHING) ✅
5. First visit to the site → site_visits increases to 1
6. Additional visits → site_visits increases: 2, 3, 4...
7. Update the server → reboot
8. defaultStats tries to generate site_visits with 0
9. site_visits already exists → the existing value is saved (4) ✅
10. New visit → site_visits increases to 5 ✅
```

### 4. Log messages (Log Messages)

When the server starts, you will see:

**If this is the first session (new data):**
```
✨ Created new stat: site_visits = 0
✨ Created new stat: money_donations = 0
...
```

**If this is an additional activation (existing data):**
```
✅ Preserved existing stat: site_visits
✅ Preserved existing stat: money_donations
...
```

### 5. Requirements

For the fix to work, you must:

1. ✅ The server is connected to **Railway's Postgres Plugin** (not a temporary database)
2. ✅ The environment variable `DATABASE_URL` is set and points to the Plugin
3. ✅ The plugin is a persistent volume (not ephemeral)

### 6. Testing

#### How to check that the fix works:

```bash
# 1. Deploy the new code to Railway
git add.
git commit -m "Fix: Preserve site_visits on server restart"
git push

# 2. Wait for deployment to finish

# 3. Visit the site 5 times

# 4. Check the number of visits (should be 5)

# 5. Update the server again (push a small change)

# 6. Visit the site again

# 7. Check the number of visits - should be 6 (not 1!) ✅
```

#### How to check directly in the database:

```sql
-- Connect to Railway database
SELECT * FROM community_stats WHERE stat_type = 'site_visits';

-- should show something like:
-- stat_type | stat_value | date_period | created_at | updated_at
-- site_visits |         5 | 2025-11-23 | ... | ...
```

### 7. Versions

- **Previous version:** 1.7.4 - site_visits resets on every update
- **Current version:** 1.7.5 - site_visits saved between updates ✅

### 8. Modified files

```
KC-MVP-server/
├── src/database/database.init.ts (updated - add site_visits + logs)
├── package.json (updated - version + script copy:schema)
├── RAILWAY_DATA_PERSISTENCE.md (new - detailed guide)
├── RAILWAY.md (updated - Data Persistence section)
└── CHANGELOG.md (new - change log)
```

## Summary

The fix ensures that **all statistics**, including `site_visits`, are **persistently saved** between server updates in Railway, provided the server is properly connected to the Postgres Plugin.

The mechanism uses ``ON CONFLICT DO NOTHING'' to not overwrite existing data, and includes detailed logs to enable tracking of the save.

---
**Date:** 2025-11-23  
**Version:** 1.7.5  
**Status:** ✅ Ready for deployment