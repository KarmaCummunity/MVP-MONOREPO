# 🚀 Quick guide: Copying data from Production to Development

**Date:** December 24, 2025  
**Version:** 2.0.0

---

## 📝 Summary

An automatic script that copies all the data from the real environment (production/main) to the development environment (development/dev) with one click of a button.

**What the script does:**
1. ✅ Exports all data from production
2. ✅ Automatic anonymization operation (emails, telephones)
3. ✅ Backs up development before replacing
4. ✅ Imports the data for development
5. ✅ Verifies that everything worked

---

## ⚡ Quick use (3 steps)

### Step 1: Setting URLs

Run the interactive script:

```bash
cd KC-MVP-server
source ./scripts/setup-db-urls.sh
```

The script will ask you:
- **Production Database URL** - Copy from Railway Dashboard → production → Postgres → Connect
- **Development Database URL** - Copy from Railway Dashboard → development → Postgres → Connect

💡 The script saves the URLs in `.env.local` so you only have to do it once!

### Step 2: Running the copy

```bash
./scripts/copy-prod-to-dev.sh
```

or via npm:

```bash
npm run data:copy-prod-to-dev
```

### Step 3: OK

The script will ask you for confirmation before it starts:

```
⚠️ This will copy ALL data from PRODUCTION to DEVELOPMENT
⚠️ Development data will be REPLACED!

Production DB: postgresql://postgres:RHkhi...
Development DB: postgresql://postgres:mmWLX...

Are you sure you want to continue? (yes/no):
```

Type `yes` and wait for the process to finish (usually 5-10 minutes).

---

## 🎯 Usage examples

### Normal use (with all security)

```bash
# Setting URLs (first time only)
source ./scripts/setup-db-urls.sh

# Full copy
./scripts/copy-prod-to-dev.sh
```

### Skipping development backup

If you're sure you don't need a backup:

```bash
./scripts/copy-prod-to-dev.sh --skip-backup
```

### Skipping anonymization (not recommended!)

**⚠️ Warning:** This will save real emails and phones in development!

```bash
./scripts/copy-prod-to-dev.sh --skip-anonymize
```

### Use with .env.local

If you saved the URLs in `.env.local`:

```bash
# Load the variables
source .env.local

# Run the copy
./scripts/copy-prod-to-dev.sh
```

---

## 📊 What happens in the process?

### STEP 1/5: Export from Production

```
🔵 Exporting data from PRODUCTION
━━━━━━━━━━━━━━━━━━┒

Connecting to production database...
This may take several minutes depending on data size...

✅ Production data exported successfully

Exported files:
  - user_profiles.json 2.5M
  - posts.json 8.3M
  - donations.json 4.1M
  - rides.json 1.2M
  ...

✅ Exported 15 tables
```

### STEP 2/5: Anonymize Data

```
🔵 Anonymizing sensitive data
━━━━━━━━━━━━━━━━━━┒

Masking emails, phones, and other PII...

✅ Data anonymized successfully

Sample anonymized emails:
  - user_abc123@dev.test
  - user_def456@dev.test
  - user_ghi789@dev.test
```

### STEP 3/5: Backup Development

```
🔵 Backing up current DEVELOPMENT data
━━━━━━━━━━━━━━━━━━┒

Creating backup of development database...
Backup will be saved to: data-backups/20251224-143022

✅ Development backup created: data-backups/20251224-143022
  Backup size: 12M
```

### STEP 4/5: Import to Development

```
🔵 Importing data to DEVELOPMENT
━━━━━━━━━━━━━━━━━━┒

Connecting to development database...
This may take several minutes...

✅ Data imported to develop successfully
```

### STEP 5/5: Verify

```
🔵 Verifying import
━━━━━━━━━━━━━━━━━━┒

Running verification checks...

📊 Database Statistics:

  ✓ user_profiles 523 rows
  ✓ posts 1847 rows
  ✓ donations 1203 rows
  ✓ rides 456 rows
  ✓ items 789 rows
  ...

✅ Emails are anonymized
✅ Verification complete!
```

### Summary

```
🎉 COPY COMPLETED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━┒

Summary:
  ✅ Exported from production
  ✅ Anonymized sensitive data
  ✅ Backed up development
  ✅ Imported for development
  ✅ Verified import

Development backup: data-backups/20251224-143022

✅ Development environment is now synced with production data!ckup: data-backups/20251224-143022

✅ Development environment is now synced with production data!

Next steps:
  1. Test the development environment
  2. Verify that anonymization worked correctly
  3. Run: DATABASE_URL="$DEV_DB_URL" npm run verify:separation
```

---

## 🔒 Security and safety

### Built-in security checks

The script includes several safety checks:

1. **Direction check** - makes sure that copies prod→dev and not the other way around
2. **Identify servers** - Identifies if the URLs change (ballast vs caboose)
3. **User confirmation** - requests explicit confirmation before starting
4. **Anonymization** - Automatically masks emails and phone numbers
5. **Automatic backup** - Saves development before replacement

### What are they complaining about?

- ✅ **Emails**: `user@example.com` → `user_abc123@dev.test`
- ✅ **Telephones**: `0501234567` → `0500000000`
- ✅ **usernames**: remain (for testing purposes)
- ✅ **Images/Links**: Remaining (for testing purposes)

---

## 📁 file structure

After a successful run:

```
KC-MVP-server/
├── scripts/
│ ├── copy-prod-to-dev.sh # The main script
│ └── setup-db-urls.sh # Setting URLs
├── data-backups/
│ └── 20251224-143022/ # Backup of development
│ ├── user_profiles.json
│ ├── posts.json
│ └── ...
├── .env.local # Reserved URLs (not in git)
└── .gitignore # makes sure .env.local doesn't go into git
```

---

## 🆘 Problem solving

### Error: "Database URLs not set"

**Solution:**

```bash
# Run setup-db-urls.sh
source ./scripts/setup-db-urls.sh

# or set manually:
export PROD_DATABASE_URL="postgresql://..."
export DEV_DATABASE_URL="postgresql://..."
```

### Error: "Connection timeout"

**Possible reasons:**
- The URL is incorrect
- Postgres is offline on Railway
- Network problem

**Solution:**
1. Check in the Railway Dashboard that Postgres is online
2. Make sure you copied `DATABASE_PUBLIC_URL` (not internal)
3. Try again - sometimes it's temporary

### Error: "Foreign key constraint violation"

**Solution:**

The script should handle this automatically. If it doesn't work:

```bash
# Run the import again - it's smart enough to skip what's already there
DATABASE_URL="$DEV_DB_URL" npm run data:import
```

### Error: "Permission denied"

**Solution:**

```bash
# Give run permissions to scripts
chmod +x scripts/*.sh

# Run again
./scripts/copy-prod-to-dev.sh
```

### The import failed - how to recover?

If the import fails, you can restore from the backup:

```bash
# Find the last backup
ls -lt data-backups/

# Return
cp -r data-backups/20251224-143022/* data-export-anonymized/
DATABASE_URL="$DEV_DB_URL" npm run data:import
```

---

## ⏱️ execution times

For a typical project:

| stage | Estimated time |
|-----|-----------|
| Export from production 2-5 minutes |
| Anonymization | 30 seconds
| Backup Development | 1-3 minutes |
| Import to Development | 3-7 minutes |
| Verification | 30 seconds
| **Total** | **7-16 minutes** |

*Times depend on the amount of data and connection speed*

---

## 🔄 Periodic update

It is recommended to run the script:

- ✅ **once a week** - before sprint planning
- ✅ **before important tests** - to work with up-to-date data
- ✅ **After major changes in the scheme** - Verify compatibility
- ✅ **When you need to check a specific bug** - with real data

### Scheduled run (optional)

You can add to crontab:

```bash
# Every Sunday at 02:00
0 2 * * 0 cd /path/to/KC-MVP-server && source .env.local && ./scripts/copy-prod-to-dev.sh --skip-backup
```

---

## 📋 Checklist

Before running:
- [ ] I am in the `KC-MVP-server` directory
- [ ] I ran `npm install`
- [ ] I have access to the Railway Dashboard
- [ ] I configured the URLs (via `setup-db-urls.sh` or `.env.local`)

During:
- [ ] I approved the copying
- [ ] The script runs without errors
- [ ] I saw "COPY COMPLETED SUCCESSFULLY"

after:
- [ ] I checked the statistics (amount of rows)
- [ ] I verified that the emails are anonymized
- [ ] I checked that the application works
- [ ] (optional) I ran `npm run verify:separation`

---

## 🔗 Related files

- `DB_COPY_GUIDE.md` - detailed step by step guide
- `scripts/copy-prod-to-dev.sh` - the main script
- `scripts/setup-db-urls.sh` - Setting URLs
- `src/scripts/export-data.ts` - export logic
- `src/scripts/anonymize-data.ts` - Anonymization logic
- `src/scripts/import-data.ts` - import logic

---

## 💡 Tips

### Tip 1: Saving time

Save the URLs in `.env.local` once:

```bash
source ./scripts/setup-db-urls.sh
# Select "yes" when asked whether to save
```

In the following times:

```bash
source .env.local && ./scripts/copy-prod-to-dev.sh
```

### Tip 2: Quick check| xargs rm -rf
```

---

## ❓ Frequently asked questions

**Q: Is it safe to run during business hours?**  
A: Yes! The script just reads from production, doesn't change anything there.

**Q: What happens if I stop in the middle?**  
A: No problem. The script is idempotent - it can be run again.

**Q: Is the anonymized data sufficient for tests?**  
A: Yes! Usernames, photos, posts - everything remains. Only emails and phone numbers change.

**Q: How do I know it worked?**  
A: The script runs automatic verification and displays statistics.

**Q: How much space does it take up?**  
A: The backups can occupy 50-200MB. Clean sleepers occasionally.

**Q: Can it be run from CI/CD?**  
A: Yes! Pass the URLs as environment variables:

```bash
PROD_DATABASE_URL="..." DEV_DATABASE_URL="..." ./scripts/copy-prod-to-dev.sh --skip-backup
```

---

**Updated:** December 24, 2025  
**Version:** 2.0.0  
**Author:** AI Assistant

For questions or problems, contact the main developer of the project.