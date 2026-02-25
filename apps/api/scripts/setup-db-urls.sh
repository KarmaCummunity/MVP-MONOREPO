#!/bin/bash
# File overview:
# - Purpose: Interactive setup for database URLs
# - Usage: source ./scripts/setup-db-urls.sh
# - Note: Use 'source' to export variables to current shell

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Database URLs Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "To find these URLs:"
echo "  1. Go to Railway Dashboard"
echo "  2. Select your project: adventurous-contentment"
echo "  3. For each environment (production/development):"
echo "     - Click on the Postgres service"
echo "     - Go to 'Connect' or 'Variables' tab"
echo "     - Copy the DATABASE_PUBLIC_URL"
echo ""

# Production URL
echo -e "${YELLOW}Production Database URL:${NC}"
echo "Example: postgresql://postgres:RHkhivARk...@ballast.proxy.rlwy.net:33648/railway"
read -p "Enter PROD_DATABASE_URL: " PROD_URL

# Development URL
echo ""
echo -e "${YELLOW}Development Database URL:${NC}"
echo "Example: postgresql://postgres:mmWLXgvXF...@caboose.proxy.rlwy.net:42564/railway"
read -p "Enter DEV_DATABASE_URL: " DEV_URL

# Validate URLs
if [ -z "$PROD_URL" ] || [ -z "$DEV_URL" ]; then
  echo -e "${YELLOW}⚠️  URLs not set. Please try again.${NC}"
  return 1
fi

# Safety check
if [[ "$PROD_URL" == *"caboose"* ]] || [[ "$DEV_URL" == *"ballast"* ]]; then
  echo -e "${YELLOW}⚠️  WARNING: URLs might be swapped!${NC}"
  echo "  Production usually uses 'ballast'"
  echo "  Development usually uses 'caboose'"
  echo ""
  read -p "Continue anyway? (yes/no): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    return 1
  fi
fi

# Export variables
export PROD_DATABASE_URL="$PROD_URL"
export DEV_DATABASE_URL="$DEV_URL"

echo ""
echo -e "${GREEN}✅ Environment variables set!${NC}"
echo ""
echo "Variables exported:"
echo "  PROD_DATABASE_URL=${PROD_DATABASE_URL:0:40}..."
echo "  DEV_DATABASE_URL=${DEV_DATABASE_URL:0:40}..."
echo ""
echo "You can now run:"
echo "  ./scripts/copy-prod-to-dev.sh"
echo ""

# Optionally save to .env.local for future use
read -p "Save to .env.local for future use? (yes/no): " -r
echo

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  cat > .env.local << EOF
# Database URLs for data copy script
# Generated: $(date)
# DO NOT COMMIT THIS FILE!

PROD_DATABASE_URL="$PROD_DATABASE_URL"
DEV_DATABASE_URL="$DEV_DATABASE_URL"
EOF
  
  # Add to .gitignore if not already there
  if ! grep -q ".env.local" .gitignore 2>/dev/null; then
    echo ".env.local" >> .gitignore
  fi
  
  echo -e "${GREEN}✅ Saved to .env.local${NC}"
  echo ""
  echo "Next time, you can load these with:"
  echo "  source .env.local"
  echo "  ./scripts/copy-prod-to-dev.sh"
fi





