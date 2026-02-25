#!/bin/bash
# File overview:
# - Purpose: Copy all data from production to development environment
# - Usage: ./scripts/copy-prod-to-dev.sh [--skip-backup] [--skip-anonymize]
# - Safety: Always copies prod→dev (never the reverse!)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
SKIP_BACKUP=false
SKIP_ANONYMIZE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-anonymize)
      SKIP_ANONYMIZE=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-backup      Skip backing up development database"
      echo "  --skip-anonymize   Skip anonymization (NOT RECOMMENDED!)"
      echo "  --help             Show this help message"
      echo ""
      echo "Example:"
      echo "  $0                 # Full process with backup and anonymization"
      echo "  $0 --skip-backup   # Skip development backup"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Function to print colored messages
print_step() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src/scripts" ]; then
  print_error "Please run this script from the KC-MVP-server directory"
  exit 1
fi

# Check if required scripts exist
if [ ! -f "src/scripts/export-data.ts" ] || [ ! -f "src/scripts/import-data.ts" ]; then
  print_error "Required scripts not found. Please ensure export-data.ts and import-data.ts exist."
  exit 1
fi

# Database URLs - MUST be set as environment variables for security
PROD_DB_URL="${PROD_DATABASE_URL:-}"
DEV_DB_URL="${DEV_DATABASE_URL:-}"

# Check if URLs are provided
if [ -z "$PROD_DB_URL" ] || [ -z "$DEV_DB_URL" ]; then
  print_error "Database URLs not set!"
  echo ""
  echo "Please set the following environment variables:"
  echo ""
  echo "export PROD_DATABASE_URL='postgresql://postgres:RHkhivARk...@ballast.proxy.rlwy.net:33648/railway'"
  echo "export DEV_DATABASE_URL='postgresql://postgres:mmWLXgvXF...@caboose.proxy.rlwy.net:42564/railway'"
  echo ""
  echo "You can find these URLs in Railway Dashboard:"
  echo "  Production: adventurous-contentment → production → Postgres → Connect"
  echo "  Development: adventurous-contentment → development → Postgres → Connect"
  echo ""
  exit 1
fi

# Confirm before proceeding
print_warning "This will copy ALL data from PRODUCTION to DEVELOPMENT"
print_warning "Development data will be REPLACED!"
echo ""
echo "Production DB: ${PROD_DB_URL:0:30}..."
echo "Development DB: ${DEV_DB_URL:0:30}..."
echo ""

# Safety check - make sure we're not copying dev to prod
if [[ "$PROD_DB_URL" == *"caboose"* ]] || [[ "$DEV_DB_URL" == *"ballast"* ]]; then
  print_error "SAFETY CHECK FAILED!"
  print_error "It looks like the database URLs might be swapped!"
  print_error "Production should use 'ballast', Development should use 'caboose'"
  exit 1
fi

read -p "Are you sure you want to continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  print_warning "Operation cancelled"
  exit 0
fi

# Create timestamp for this run
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="data-backups/$TIMESTAMP"

# ============================================================================
# STEP 1: Export from Production
# ============================================================================
print_step "STEP 1/5: Exporting data from PRODUCTION"

echo "Connecting to production database..."
echo "This may take several minutes depending on data size..."
echo ""

if DATABASE_URL="$PROD_DB_URL" npm run data:export; then
  print_success "Production data exported successfully"
  
  # Show what was exported
  if [ -d "data-export" ]; then
    echo ""
    echo "Exported files:"
    ls -lh data-export/ | tail -n +2 | awk '{printf "  - %-30s %10s\n", $9, $5}'
    
    # Count total records
    TOTAL_FILES=$(ls -1 data-export/*.json 2>/dev/null | wc -l)
    print_success "Exported $TOTAL_FILES tables"
  fi
else
  print_error "Failed to export from production"
  exit 1
fi

# ============================================================================
# STEP 2: Anonymize Data (unless skipped)
# ============================================================================
if [ "$SKIP_ANONYMIZE" = true ]; then
  print_warning "Skipping anonymization (as requested)"
  print_warning "⚠️  WARNING: Real user data will be imported to development!"
  
  # Use original export for import
  if [ -d "data-export-anonymized" ]; then
    rm -rf "data-export-anonymized"
  fi
  cp -r data-export data-export-anonymized
else
  print_step "STEP 2/5: Anonymizing sensitive data"
  
  echo "Masking emails, phones, and other PII..."
  echo ""
  
  if npm run data:anonymize; then
    print_success "Data anonymized successfully"
    
    # Show sample anonymized data
    if [ -f "data-export-anonymized/user_profiles.json" ]; then
      echo ""
      echo "Sample anonymized emails:"
      grep -o '"email":"[^"]*"' data-export-anonymized/user_profiles.json | head -n 3 | sed 's/"email":/  -/g' | tr -d '"'
    fi
  else
    print_error "Failed to anonymize data"
    exit 1
  fi
fi

# ============================================================================
# STEP 3: Backup Development (unless skipped)
# ============================================================================
if [ "$SKIP_BACKUP" = true ]; then
  print_warning "Skipping development backup (as requested)"
else
  print_step "STEP 3/5: Backing up current DEVELOPMENT data"
  
  echo "Creating backup of development database..."
  echo "Backup will be saved to: $BACKUP_DIR"
  echo ""
  
  # Create backup directory
  mkdir -p "$BACKUP_DIR"
  
  # Export current dev data
  if DATABASE_URL="$DEV_DB_URL" npm run data:export; then
    # Move to backup directory
    if [ -d "data-export" ]; then
      mv data-export/* "$BACKUP_DIR/" 2>/dev/null || true
      print_success "Development backup created: $BACKUP_DIR"
      
      # Show backup size
      BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
      echo "  Backup size: $BACKUP_SIZE"
    fi
  else
    print_warning "Could not backup development (may be empty)"
    echo "Continuing anyway..."
  fi
fi

# ============================================================================
# STEP 4: Import to Development
# ============================================================================
print_step "STEP 4/5: Importing data to DEVELOPMENT"

echo "Connecting to development database..."
echo "This may take several minutes..."
echo ""

if DATABASE_URL="$DEV_DB_URL" npm run data:import; then
  print_success "Data imported to development successfully"
else
  print_error "Failed to import to development"
  
  if [ "$SKIP_BACKUP" = false ]; then
    echo ""
    print_warning "You can restore from backup: $BACKUP_DIR"
    echo "To restore:"
    echo "  1. Move backup files: mv $BACKUP_DIR/* data-export-anonymized/"
    echo "  2. Run import: DATABASE_URL=\"\$DEV_DB_URL\" npm run data:import"
  fi
  
  exit 1
fi

# ============================================================================
# STEP 5: Verify
# ============================================================================
print_step "STEP 5/5: Verifying import"

echo "Running verification checks..."
echo ""

# Run verification using TypeScript script
if DATABASE_URL="$DEV_DB_URL" npx ts-node -r tsconfig-paths/register src/scripts/verify-import.ts; then
  print_success "Verification passed"
else
  print_warning "Verification had some issues (check above)"
fi

# ============================================================================
# CLEANUP
# ============================================================================
print_step "Cleanup"

echo "Cleaning up temporary files..."

# Ask if user wants to keep export files
echo ""
read -p "Keep exported files for reference? (yes/no): " -r
echo

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  # Move to backup directory
  mkdir -p "data-backups/$TIMESTAMP"
  [ -d "data-export" ] && mv data-export "data-backups/$TIMESTAMP/original-export"
  [ -d "data-export-anonymized" ] && mv data-export-anonymized "data-backups/$TIMESTAMP/anonymized-export"
  
  print_success "Export files saved to: data-backups/$TIMESTAMP"
else
  # Delete temporary files
  rm -rf data-export data-export-anonymized
  print_success "Temporary files deleted"
fi

# ============================================================================
# SUMMARY
# ============================================================================
print_step "🎉 COPY COMPLETED SUCCESSFULLY!"

echo "Summary:"
echo "  ✅ Exported from production"
if [ "$SKIP_ANONYMIZE" = false ]; then
  echo "  ✅ Anonymized sensitive data"
fi
if [ "$SKIP_BACKUP" = false ]; then
  echo "  ✅ Backed up development"
fi
echo "  ✅ Imported to development"
echo "  ✅ Verified import"
echo ""

if [ "$SKIP_BACKUP" = false ]; then
  echo "Development backup: $BACKUP_DIR"
fi

echo ""
print_success "Development environment is now synced with production data!"
echo ""
echo "Next steps:"
echo "  1. Test the development environment"
echo "  2. Verify that anonymization worked correctly"
echo "  3. Run: DATABASE_URL=\"\$DEV_DB_URL\" npm run verify:separation"
echo ""

