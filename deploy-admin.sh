#!/bin/bash

# Deploy Admin to Firebase Hosting
# Usage: ./deploy-admin.sh

set -e

echo "🚀 Deploying Admin to Firebase Hosting..."
echo ""

# Navigate to admin directory
cd "$(dirname "$0")/apps/admin"

# Build admin
echo "📦 Building admin..."
npm run build

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
npx firebase-tools deploy --only hosting

echo ""
echo "✅ Admin deployed successfully!"
echo "🌐 Check your Firebase console for the URL"
