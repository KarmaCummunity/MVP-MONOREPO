#!/usr/bin/env bash
# Deployment script for karma-community-kc.com
set -euo pipefail

THIS_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$(cd "$THIS_DIR/.." && pwd)"

echo "🚀 Deploying KC to karma-community-kc.com..."

# Build the web version
cd "$CLIENT_DIR"
echo "📦 Building web version..."
npm run build:web

# Check if build was successful
if [[ ! -d "dist" ]]; then
  echo "❌ Build failed - dist directory not found"
  exit 1
fi

echo "✅ Build completed successfully!"
echo "📁 Build output location: dist/"
echo ""
echo "📋 Next steps:"
echo "1. Upload the contents of 'dist/' to your hosting provider"
echo "2. Configure your domain DNS to point to your hosting provider"
echo "3. Set up SSL certificate for https://karma-community-kc.com"
echo ""
echo "🔧 For Railway deployment:"
echo "   - Push to your Railway-connected repository"
echo "   - Railway will automatically deploy from the web-build directory"
echo ""
echo "🔧 For Vercel deployment:"
echo "   - Push to your Vercel-connected repository"
echo "   - Vercel will automatically build and deploy"
echo ""
echo "🔧 For manual deployment:"
echo "   - Upload web-build/* to your web server"
echo "   - Configure nginx/apache to serve the static files"
