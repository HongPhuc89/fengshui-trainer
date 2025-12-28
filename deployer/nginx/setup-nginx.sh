#!/bin/bash

# Nginx Setup Script for book-api.hongphuc.top
# Run this on your VPS

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🌐 Nginx Setup for book-api.hongphuc.top"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# 1. Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
apt update
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx installed${NC}"
echo ""

# 2. Create Nginx config
echo -e "${YELLOW}📝 Creating Nginx configuration...${NC}"

cat > /etc/nginx/sites-available/quiz-backend << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name book-api.hongphuc.top;

    # Logs
    access_log /var/log/nginx/quiz-backend-access.log;
    error_log /var/log/nginx/quiz-backend-error.log;

    # Client body size (for file uploads)
    client_max_body_size 50M;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint (no logging)
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
}
EOF

echo -e "${GREEN}✓ Configuration created${NC}"
echo ""

# 3. Enable site
echo -e "${YELLOW}🔗 Enabling site...${NC}"
ln -sf /etc/nginx/sites-available/quiz-backend /etc/nginx/sites-enabled/
echo -e "${GREEN}✓ Site enabled${NC}"
echo ""

# 4. Test Nginx config
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
nginx -t
echo -e "${GREEN}✓ Configuration valid${NC}"
echo ""

# 5. Reload Nginx
echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

# 6. Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw allow 'Nginx Full'
ufw allow OpenSSH
echo "y" | ufw enable
echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# 7. Install Certbot for SSL
echo -e "${YELLOW}🔐 Installing Certbot...${NC}"
apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✓ Certbot installed${NC}"
echo ""

# 8. Get SSL certificate
echo -e "${YELLOW}📜 Obtaining SSL certificate...${NC}"
read -p "Enter your email for SSL certificate: " email

certbot --nginx -d book-api.hongphuc.top --non-interactive --agree-tos -m "$email"

echo -e "${GREEN}✓ SSL certificate obtained${NC}"
echo ""

# 9. Test auto-renewal
echo -e "${YELLOW}🔄 Testing SSL auto-renewal...${NC}"
certbot renew --dry-run
echo -e "${GREEN}✓ Auto-renewal configured${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Nginx Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Your API is now available at:"
echo "  HTTP:  http://book-api.hongphuc.top"
echo "  HTTPS: https://book-api.hongphuc.top"
echo ""
echo "Test endpoints:"
echo "  curl https://book-api.hongphuc.top/api/health"
echo ""
echo "Nginx commands:"
echo "  sudo nginx -t              # Test config"
echo "  sudo systemctl reload nginx # Reload"
echo "  sudo systemctl status nginx # Status"
echo ""
echo "SSL renewal:"
echo "  sudo certbot renew        # Manual renewal"
echo "  sudo certbot certificates # View certificates"
echo ""
