#!/bin/bash

# Simple VPS Deployment Script
# Build locally and deploy to VPS

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Quiz Game Backend - Simple Deploy"
echo "====================================="
echo ""

# Load config from .deploy.env if exists
if [ -f ".deploy.env" ]; then
    echo -e "${YELLOW}📋 Loading config from .deploy.env...${NC}"
    source .deploy.env
    echo -e "${GREEN}✓ Config loaded${NC}"
    echo ""
else
    # Interactive configuration
    read -p "VPS IP or domain: " VPS_HOST
    read -p "VPS user [deploy]: " VPS_USER
    VPS_USER=${VPS_USER:-deploy}
    read -p "VPS directory [~/quiz-game-backend]: " VPS_DIR
    VPS_DIR=${VPS_DIR:-~/quiz-game-backend}

    # Ask to save config
    read -p "Save config to .deploy.env for future use? (y/n): " SAVE_CONFIG
    if [ "$SAVE_CONFIG" = "y" ]; then
        cat > .deploy.env << EOF
# VPS Deployment Configuration
VPS_HOST=$VPS_HOST
VPS_USER=$VPS_USER
VPS_DIR=$VPS_DIR
EOF
        echo -e "${GREEN}✓ Config saved to .deploy.env${NC}"
        echo ""
    fi
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  VPS: $VPS_USER@$VPS_HOST"
echo "  Directory: $VPS_DIR"
echo ""

# 1. Build locally
echo -e "${YELLOW}📦 Building backend...${NC}"
npm run build --workspace=@quiz-game/backend
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# 2. Prepare deployment package
echo -e "${YELLOW}📋 Preparing deployment package...${NC}"
cd apps/backend

# Create temp deploy directory
DEPLOY_DIR="../../.deploy-temp"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy files
cp -r dist $DEPLOY_DIR/
cp -r config $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/

echo -e "${GREEN}✓ Package prepared${NC}"
echo ""

# 3. Upload to VPS
echo -e "${YELLOW}📤 Uploading to VPS...${NC}"
cd ../../
scp -r .deploy-temp/* $VPS_USER@$VPS_HOST:$VPS_DIR/

echo -e "${GREEN}✓ Upload complete${NC}"
echo ""

# 4. Install dependencies on VPS
echo -e "${YELLOW}📥 Installing dependencies on VPS...${NC}"
ssh $VPS_USER@$VPS_HOST << EOF
cd $VPS_DIR
npm install --production
echo "✓ Dependencies installed"
EOF

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# 5. Restart application
echo -e "${YELLOW}🔄 Restarting application...${NC}"
ssh $VPS_USER@$VPS_HOST << EOF
cd $VPS_DIR
pm2 restart quiz-backend || pm2 start ecosystem.config.js
pm2 save
echo "✓ Application restarted"
EOF

echo -e "${GREEN}✓ Application restarted${NC}"
echo ""

# 6. Check status
echo -e "${YELLOW}📊 Checking status...${NC}"
ssh $VPS_USER@$VPS_HOST << EOF
pm2 status quiz-backend
EOF

echo ""

# Cleanup
rm -rf .deploy-temp

echo ""
echo "====================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "====================================="
echo ""
echo "Your backend is now running on:"
echo "  http://$VPS_HOST:3000/api"
echo ""
echo "Useful commands:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 logs quiz-backend'"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 restart quiz-backend'"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 monit'"
echo ""
