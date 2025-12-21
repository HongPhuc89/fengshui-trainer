# 🌐 Nginx Setup Guide - book-api.hongphuc.top

Complete guide to setup Nginx reverse proxy for your backend API.

## 📋 Overview

**Domain:** `book-api.hongphuc.top`
**Backend:** Node.js on port 3000
**Nginx:** Reverse proxy on port 80/443

**Architecture:**

```
Internet → Nginx (80/443) → Node.js (3000)
```

---

## ⚡ Quick Setup (Automated)

### Option 1: Run Setup Script

**On your VPS:**

```bash
# 1. Upload script
scp nginx/setup-nginx.sh user@vps:~/

# 2. SSH to VPS
ssh user@vps

# 3. Run script
sudo bash setup-nginx.sh
```

Script will:

- ✅ Install Nginx
- ✅ Create configuration
- ✅ Enable site
- ✅ Configure firewall
- ✅ Install Certbot
- ✅ Get SSL certificate
- ✅ Setup auto-renewal

**Done!** Your API is now at `https://book-api.hongphuc.top`

---

## 📝 Manual Setup (Step by Step)

### Step 1: Install Nginx

```bash
# SSH to VPS
ssh user@vps

# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install -y nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 2: Create Nginx Configuration

```bash
# Create config file
sudo nano /etc/nginx/sites-available/quiz-backend
```

**Paste this configuration:**

```nginx
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
```

**Save:** `Ctrl+X`, `Y`, `Enter`

### Step 3: Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/quiz-backend /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 4: Configure Firewall

```bash
# Allow Nginx
sudo ufw allow 'Nginx Full'

# Allow SSH (important!)
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 5: Setup SSL (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d book-api.hongphuc.top

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect option (2 for HTTPS redirect)
```

**Certbot will:**

- ✅ Get SSL certificate from Let's Encrypt
- ✅ Update Nginx config automatically
- ✅ Setup auto-renewal

### Step 6: Test Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# If successful, auto-renewal is configured
```

---

## 🧪 Testing

### Test HTTP (before SSL)

```bash
curl http://book-api.hongphuc.top/api/health
```

### Test HTTPS (after SSL)

```bash
curl https://book-api.hongphuc.top/api/health
```

### Test from Browser

Open: `https://book-api.hongphuc.top/api/health`

Should return:

```json
{
  "status": "ok",
  "timestamp": "2024-12-21T..."
}
```

---

## 🔧 Configuration Details

### Features Included

**Security:**

- ✅ SSL/TLS encryption
- ✅ Security headers
- ✅ XSS protection
- ✅ Clickjacking protection

**Performance:**

- ✅ Gzip compression
- ✅ HTTP/2 support
- ✅ Connection keep-alive

**Functionality:**

- ✅ WebSocket support
- ✅ Large file uploads (50MB)
- ✅ Proper timeouts
- ✅ Health check endpoint

### Important Settings

**File Upload Size:**

```nginx
client_max_body_size 50M;
```

Increase if you need larger uploads.

**Timeouts:**

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

Increase for long-running requests.

**Compression:**

```nginx
gzip on;
gzip_types ...;
```

Reduces bandwidth usage.

---

## 🔄 Update .env CORS

After setting up Nginx, update your backend .env:

```bash
# Edit .env.production locally
code apps/backend/.env.production
```

**Update CORS_ORIGIN:**

```env
# Before
CORS_ORIGIN=*

# After
CORS_ORIGIN=https://book-api.hongphuc.top
```

**Upload to VPS:**

```bash
npm run env:edit
# Choose option 4
# Restart: y
```

---

## 📊 Nginx Commands

### Service Management

```bash
# Start
sudo systemctl start nginx

# Stop
sudo systemctl stop nginx

# Restart
sudo systemctl restart nginx

# Reload (no downtime)
sudo systemctl reload nginx

# Status
sudo systemctl status nginx

# Enable on boot
sudo systemctl enable nginx
```

### Configuration

```bash
# Test config
sudo nginx -t

# View config
sudo cat /etc/nginx/sites-available/quiz-backend

# Edit config
sudo nano /etc/nginx/sites-available/quiz-backend

# After editing, reload
sudo nginx -t && sudo systemctl reload nginx
```

### Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/quiz-backend-access.log

# Error logs
sudo tail -f /var/log/nginx/quiz-backend-error.log

# All Nginx logs
sudo tail -f /var/log/nginx/*.log
```

---

## 🔐 SSL Management

### Certbot Commands

```bash
# Renew certificates
sudo certbot renew

# Renew specific domain
sudo certbot renew --cert-name book-api.hongphuc.top

# List certificates
sudo certbot certificates

# Delete certificate
sudo certbot delete --cert-name book-api.hongphuc.top
```

### Auto-Renewal

Certbot creates a systemd timer:

```bash
# Check timer status
sudo systemctl status certbot.timer

# View renewal schedule
sudo certbot renew --dry-run
```

Certificates auto-renew every 60 days.

---

## 🐛 Troubleshooting

### Nginx Won't Start

```bash
# Check config
sudo nginx -t

# Check logs
sudo journalctl -u nginx -n 50

# Check if port 80/443 is in use
sudo lsof -i :80
sudo lsof -i :443
```

### Can't Access API

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check backend is running
pm2 status

# Check firewall
sudo ufw status

# Test locally on VPS
curl http://localhost:3000/api/health
curl http://localhost/api/health
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### 502 Bad Gateway

**Cause:** Backend not running

```bash
# Check backend
pm2 status quiz-backend

# Restart backend
pm2 restart quiz-backend

# Check logs
pm2 logs quiz-backend
```

### 413 Request Entity Too Large

**Cause:** File too large

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/quiz-backend

# Increase size
client_max_body_size 100M;

# Reload
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📁 File Locations

```
/etc/nginx/
├── nginx.conf                          # Main config
├── sites-available/
│   └── quiz-backend                    # Your site config
├── sites-enabled/
│   └── quiz-backend -> ../sites-available/quiz-backend
└── conf.d/

/var/log/nginx/
├── quiz-backend-access.log             # Access logs
├── quiz-backend-error.log              # Error logs
├── access.log                          # General access
└── error.log                           # General errors

/etc/letsencrypt/
├── live/
│   └── book-api.hongphuc.top/
│       ├── fullchain.pem               # SSL certificate
│       └── privkey.pem                 # Private key
└── renewal/
    └── book-api.hongphuc.top.conf      # Renewal config
```

---

## 🎯 Complete Setup Checklist

### Before Setup

- [ ] VPS is running
- [ ] Backend is deployed and running on port 3000
- [ ] Domain DNS is pointing to VPS IP
- [ ] SSH access to VPS

### During Setup

- [ ] Nginx installed
- [ ] Configuration created
- [ ] Site enabled
- [ ] Firewall configured
- [ ] SSL certificate obtained
- [ ] Auto-renewal tested

### After Setup

- [ ] HTTP redirects to HTTPS
- [ ] API responds at https://book-api.hongphuc.top
- [ ] Health check works
- [ ] CORS updated in .env
- [ ] Backend restarted

### Verification

```bash
# Test API
curl https://book-api.hongphuc.top/api/health

# Check SSL
curl -I https://book-api.hongphuc.top

# Check redirect
curl -I http://book-api.hongphuc.top
```

---

## 🎉 Done!

Your API is now available at:

**Production URL:**

```
https://book-api.hongphuc.top
```

**Endpoints:**

```
https://book-api.hongphuc.top/api/health
https://book-api.hongphuc.top/api/auth/login
https://book-api.hongphuc.top/api/books
...
```

**Update your frontend:**

```env
# Admin .env
VITE_API_URL=https://book-api.hongphuc.top

# Mobile .env
EXPO_PUBLIC_API_URL=https://book-api.hongphuc.top
```

**Secure, fast, and production-ready!** 🚀
