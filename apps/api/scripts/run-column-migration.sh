#!/bin/bash

# Script to run the column migration on local database
# This ensures google_id and roles columns exist

set -e

echo "🔧 Running column migration..."

# Check if Docker container is running
if ! docker ps | grep -q kc-postgres; then
    echo "❌ Error: kc-postgres container is not running"
    echo "Please start the container first with: docker-compose up -d"
    exit 1
fi

# Run the migration
docker exec -i kc-postgres psql -U kcuser -d kc_db < src/database/migration-ensure-columns.sql

echo "✅ Migration completed successfully"
