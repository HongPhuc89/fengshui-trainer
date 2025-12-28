#!/bin/bash

# VPS Environment Editor
# Quick script to edit .env on VPS

set -e

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Load config
if [ -f ".deploy.env" ]; then
    source .deploy.env
else
    echo "Error: .deploy.env not found"
    echo "Run: cp .deploy.env.example .deploy.env"
    exit 1
fi

echo -e "${YELLOW}🔧 VPS Environment Editor${NC}"
echo "VPS: $VPS_USER@$VPS_HOST"
echo "Directory: $VPS_DIR"
echo ""

# Menu
echo "Choose an option:"
echo "1) Edit .env on VPS (nano)"
echo "2) Edit .env on VPS (vi)"
echo "3) View current .env"
echo "4) Upload local .env.production to VPS"
echo "5) Download VPS .env to local"
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Opening nano editor on VPS...${NC}"
        ssh -t $VPS_USER@$VPS_HOST "cd $VPS_DIR && nano .env"

        read -p "Restart application? (y/n): " restart
        if [ "$restart" = "y" ]; then
            ssh $VPS_USER@$VPS_HOST "pm2 restart quiz-backend"
            echo -e "${GREEN}✓ Application restarted${NC}"
        fi
        ;;
    2)
        echo -e "${YELLOW}Opening vi editor on VPS...${NC}"
        ssh -t $VPS_USER@$VPS_HOST "cd $VPS_DIR && vi .env"

        read -p "Restart application? (y/n): " restart
        if [ "$restart" = "y" ]; then
            ssh $VPS_USER@$VPS_HOST "pm2 restart quiz-backend"
            echo -e "${GREEN}✓ Application restarted${NC}"
        fi
        ;;
    3)
        echo -e "${YELLOW}Current .env on VPS:${NC}"
        echo "================================"
        ssh $VPS_USER@$VPS_HOST "cat $VPS_DIR/.env"
        echo "================================"
        ;;
    4)
        if [ ! -f "apps/backend/.env.production" ]; then
            echo "Error: apps/backend/.env.production not found"
            echo "Create it first with your production settings"
            exit 1
        fi

        echo -e "${YELLOW}Uploading .env.production to VPS...${NC}"
        scp apps/backend/.env.production $VPS_USER@$VPS_HOST:$VPS_DIR/.env
        echo -e "${GREEN}✓ Uploaded${NC}"

        read -p "Restart application? (y/n): " restart
        if [ "$restart" = "y" ]; then
            ssh $VPS_USER@$VPS_HOST "pm2 restart quiz-backend"
            echo -e "${GREEN}✓ Application restarted${NC}"
        fi
        ;;
    5)
        echo -e "${YELLOW}Downloading .env from VPS...${NC}"
        scp $VPS_USER@$VPS_HOST:$VPS_DIR/.env ./vps-env-backup.txt
        echo -e "${GREEN}✓ Downloaded to: vps-env-backup.txt${NC}"
        echo "You can now edit locally and upload with option 4"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
