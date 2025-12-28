#!/bin/bash

# Deploy Admin Dashboard to Firebase Hosting

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Deploying Admin Dashboard to Firebase"
echo "=========================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Firebase${NC}"
    echo "Run: firebase login"
    exit 1
fi

# Check if .env.production exists
if [ ! -f "apps/admin/.env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Creating from example..."

    cat > apps/admin/.env.production << EOF
VITE_API_URL=https://book-api.hongphuc.top
VITE_APP_NAME=Quiz Game Admin
VITE_APP_ENV=production
EOF

    echo -e "${GREEN}✓ Created .env.production${NC}"
    echo ""
fi

# Show environment
echo -e "${YELLOW}📋 Environment Configuration:${NC}"
cat apps/admin/.env.production
echo ""

# Build
echo -e "${YELLOW}📦 Building admin dashboard...${NC}"
npm run build --workspace=@quiz-game/admin

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Check build output
if [ ! -d "apps/admin/dist" ]; then
    echo -e "${RED}❌ Build directory not found${NC}"
    exit 1
fi

echo -e "${YELLOW}📊 Build size:${NC}"
du -sh apps/admin/dist
echo ""

# Deploy
echo -e "${YELLOW}🚀 Deploying to Firebase...${NC}"
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deploy failed${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Your admin dashboard is now live!"
echo ""
echo "Next steps:"
echo "1. Test the deployment"
echo "2. Setup custom domain (optional)"
echo "3. Update backend CORS if needed"
echo ""
