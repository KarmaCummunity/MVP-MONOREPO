#!/bin/sh
# Update build timestamp in index.html for cache busting

set -e

# Get current timestamp
TIMESTAMP=$(date +%s)

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "Updating build version: $VERSION (timestamp: $TIMESTAMP)"

# Update web/index.html template
if [ -f "web/index.html" ]; then
  # Alpine Linux uses BusyBox sed (no -i with backup)
  sed -i "s/__BUILD_TIMESTAMP__/${TIMESTAMP}/g" "web/index.html"
  sed -i "s/__APP_VERSION__/${VERSION}/g" "web/index.html"
  echo "✓ Updated web/index.html"
fi

# Update manifest.json with version
if [ -f "web/manifest.json" ]; then
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('web/manifest.json', 'utf8'));
    manifest.version = '${VERSION}';
    manifest.build_timestamp = ${TIMESTAMP};
    fs.writeFileSync('web/manifest.json', JSON.stringify(manifest, null, 2));
  "
  echo "✓ Updated web/manifest.json"
fi

echo "Build version updated successfully!"

