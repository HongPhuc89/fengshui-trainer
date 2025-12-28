#!/bin/bash

# Quick fix for missing .env on VPS

set -e

# Load VPS config
if [ ! -f ".deploy.env" ]; then
    echo "Error: .deploy.env not found"
    echo "Create it first with VPS details"
    exit 1
fi

source .deploy.env

echo "🔧 Fixing .env on VPS..."
echo "VPS: $VPS_USER@$VPS_HOST"
echo "Directory: $VPS_DIR"
echo ""

# Check if .env.production exists locally
if [ ! -f "apps/backend/.env.production" ]; then
    echo "❌ apps/backend/.env.production not found"
    echo ""
    echo "Create it first:"
    echo "  cp apps/backend/.env.production.example apps/backend/.env.production"
    echo "  code apps/backend/.env.production"
    echo ""
    exit 1
fi

# Upload .env
echo "📤 Uploading .env to VPS..."
scp apps/backend/.env.production $VPS_USER@$VPS_HOST:$VPS_DIR/.env

# Set permissions
echo "🔐 Setting permissions..."
ssh $VPS_USER@$VPS_HOST "chmod 600 $VPS_DIR/.env"

# Restart app
echo "🔄 Restarting application..."
ssh $VPS_USER@$VPS_HOST "pm2 restart quiz-game"

echo ""
echo "✅ Done!"
echo ""
echo "Check logs:"
echo "  ssh $VPS_USER@$VPS_HOST 'pm2 logs quiz-game'"
