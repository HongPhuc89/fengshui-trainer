#!/bin/bash

# Scripts to deploy backend to VPS locally
# Mimics the GitHub Action deployment process

set -e

# Configuration
# Search for .deploy.env in root or scripts directory
if [ -f ".deploy.env" ]; then
    DEPLOY_ENV_FILE=".deploy.env"
elif [ -f "scripts/.deploy.env" ]; then
    DEPLOY_ENV_FILE="scripts/.deploy.env"
else
    echo "❌ Error: .deploy.env not found in root or scripts directory."
    echo "Please create it from deployer/.deploy.env.example and fill in your VPS details."
    exit 1
fi

echo "📂 Using config from: $DEPLOY_ENV_FILE"

# Load variables robustly
# 1. Read file 2. Remove CR 3. Ignore comments and empty lines 4. Export each line
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^#.* ]] && continue
    [[ -z $key ]] && continue

    # Trim whitespace and CR from key and value
    key=$(echo "$key" | tr -d '\r' | xargs)
    value=$(echo "$value" | tr -d '\r' | xargs)

    # Export the variable
    if [ ! -z "$key" ]; then
        export "$key=$value"
    fi
done < "$DEPLOY_ENV_FILE"

if [ -z "$VPS_HOST" ] || [ -z "$VPS_USER" ] || [ -z "$VPS_DIR" ]; then
    echo "❌ Error: VPS_HOST, VPS_USER, and VPS_DIR must be set in $DEPLOY_ENV_FILE"
    exit 1
fi

echo "🚀 Starting local deployment to $VPS_USER@$VPS_HOST:$VPS_DIR"

# 1. Build backend
echo "🏗️ Building backend..."
npm run backend:build

# 2. Prepare deployment package
echo "📦 Preparing deployment package..."
rm -rf .deploy-temp
mkdir -p .deploy-temp/backend-dist
mkdir -p .deploy-temp/config

# Copy files from apps/backend/dist
cp -r apps/backend/dist/* .deploy-temp/backend-dist/
# Copy package files
cp apps/backend/package.json .deploy-temp/
cp apps/backend/package-lock.json .deploy-temp/ 2>/dev/null || true
# Copy config
cp -r config/* .deploy-temp/config/
# Copy PM2 config
cp ecosystem.config.js .deploy-temp/

# 3. Create deployment archive
echo "📦 Creating deployment archive..."
tar -czf deploy.tar.gz -C .deploy-temp .

# 4. Prepare VPS and Upload
echo "🔍 Preparing server and uploading archive..."
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_DIR/backups $VPS_DIR/apps/backend $VPS_DIR/config $VPS_DIR/logs"

echo "📤 Uploading archive (this should be fast)..."
scp deploy.tar.gz $VPS_USER@$VPS_HOST:$VPS_DIR/

# 5. Remote commands
echo "📥 Extracting and restarting service on VPS..."
ssh $VPS_USER@$VPS_HOST << ENDSSH
    set -e
    cd "$VPS_DIR"

    echo "📦 Extracting files..."
    tar -xzf deploy.tar.gz
    rm deploy.tar.gz

    # Based on .deploy-temp structure:
    # .deploy-temp/backend-dist/ -> apps/backend/dist/
    # .deploy-temp/config/       -> config/
    # .deploy-temp/package.json  -> apps/backend/

    echo "📂 Organizing files..."
    mkdir -p apps/backend/dist
    cp -r backend-dist/* apps/backend/dist/
    cp package*.json apps/backend/
    # config/ and ecosystem.config.js are already at root of extraction

    # Cleanup temp extracted folders
    rm -rf backend-dist package*.json

    echo "📝 Installing production dependencies..."
    cd apps/backend
    npm install --omit=dev --legacy-peer-deps
    cd ../..

    echo "🔄 Restarting services..."
    pm2 delete backend || true
    pm2 start ecosystem.config.js --only backend
    pm2 save

    echo "📊 Service status:"
    pm2 status backend

    echo "✅ Remote commands completed"
ENDSSH

# 6. Cleanup local temp files
rm -rf .deploy-temp deploy.tar.gz

echo ""
echo "====================================="
echo "✅ Local deployment complete!"
echo "====================================="
echo "Backend should be available at: http://$VPS_HOST:3000/api"
