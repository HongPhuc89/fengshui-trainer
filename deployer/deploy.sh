#!/bin/bash

# Deploy script for Quiz Game Backend
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
BUILD_DIR="apps/backend/dist"
DEPLOY_DIR="/var/www/quiz-game/current"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Step 1: Build
echo "📦 Building application..."
npm run build

# Step 2: Verify config directory exists in dist
if [ ! -d "$BUILD_DIR/config" ]; then
    echo "⚠️  Config directory not found in dist, copying..."
    mkdir -p "$BUILD_DIR/config"
    cp -r config/* "$BUILD_DIR/config/"
fi

echo "✅ Build completed successfully"

# Step 3: Show files to deploy
echo ""
echo "📋 Files ready for deployment:"
echo "  - $BUILD_DIR/"
echo "  - apps/backend/package.json"
echo "  - apps/backend/package-lock.json"
echo ""

# Step 4: Instructions
echo "📝 Next steps:"
echo ""
echo "1. Copy files to server:"
echo "   rsync -avz --delete $BUILD_DIR/ user@server:$DEPLOY_DIR/dist/"
echo "   rsync -avz apps/backend/package*.json user@server:$DEPLOY_DIR/"
echo ""
echo "2. On the server, run:"
echo "   cd $DEPLOY_DIR"
echo "   npm ci --production"
echo "   npm run migration:run"
echo "   pm2 restart quiz-game-api"
echo ""
echo "3. Or use the deployment guide in DEPLOYMENT.md"
echo ""

echo "✨ Deployment preparation complete!"
