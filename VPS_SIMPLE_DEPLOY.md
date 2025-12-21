# 🚀 Simple VPS Deployment - Build Local & Deploy

Deploy backend to VPS with external database (e.g., Supabase, Railway, etc.)

## 📋 Overview

**Architecture:**

- 🖥️ **VPS:** Run Node.js backend only
- 🗄️ **Database:** External (Supabase/Railway/other)
- 🏗️ **Build:** Local machine
- 📦 **Deploy:** Copy built files to VPS

**Benefits:**

- ✅ No build tools needed on VPS
- ✅ Faster deployment
- ✅ Smaller VPS footprint
- ✅ Use managed database service

---

## 1️⃣ Local Build

### Build Backend

```bash
# Navigate to project
cd d:\code\2025\quiz_game\quiz_game

# Install dependencies (if not already)
npm install

# Build backend
npm run build --workspace=@quiz-game/backend

# Verify build
ls apps/backend/dist
# Should see: main.js and other compiled files
```

### Prepare Deployment Package

```bash
# Create deployment folder
mkdir deploy-package
cd deploy-package

# Copy built files
cp -r ../apps/backend/dist ./
cp ../apps/backend/package.json ./
cp ../apps/backend/package-lock.json ./

# Copy only production dependencies (optional)
# We'll install on VPS instead
```

**Your deploy-package should contain:**

```
deploy-package/
├── dist/           # Built JavaScript files
├── package.json    # Dependencies list
└── package-lock.json
```

---

## 2️⃣ VPS Setup (One-time)

### Connect to VPS

```bash
ssh user@your-vps-ip
```

### Install Node.js & PM2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x.x

# Install PM2
sudo npm install -g pm2

# Verify
pm2 --version
```

### Create App Directory

```bash
# Create directory
mkdir -p ~/quiz-game-backend
cd ~/quiz-game-backend
```

---

## 3️⃣ Deploy to VPS

### Option A: Using SCP (Recommended)

**From your local machine:**

```bash
# Navigate to deploy package
cd d:\code\2025\quiz_game\quiz_game\deploy-package

# Copy to VPS
scp -r dist package.json package-lock.json user@your-vps-ip:~/quiz-game-backend/

# Or copy everything at once
cd ..
scp -r deploy-package/* user@your-vps-ip:~/quiz-game-backend/
```

### Option B: Using SFTP

```bash
# Connect with SFTP
sftp user@your-vps-ip

# Navigate to target directory
cd quiz-game-backend

# Upload files
put -r dist
put package.json
put package-lock.json

# Exit
bye
```

### Option C: Using Git (Alternative)

```bash
# On VPS
cd ~/quiz-game-backend
git clone https://github.com/yourusername/quiz_game.git .
npm run build --workspace=@quiz-game/backend
```

---

## 4️⃣ Configure VPS

### Install Production Dependencies

```bash
# SSH to VPS
ssh user@your-vps-ip

# Navigate to app directory
cd ~/quiz-game-backend

# Install ONLY production dependencies
npm install --production

# Or if you want all dependencies
npm install
```

### Create Environment File

```bash
# Create .env file
nano .env
```

**Add your configuration:**

```env
# Server
PORT=3000
NODE_ENV=production

# External Database (Supabase example)
DATABASE_HOST=db.your-supabase-project.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-supabase-password
DATABASE_NAME=postgres
DATABASE_SSL=true

# Or Railway example
# DATABASE_URL=postgresql://user:pass@host:port/dbname

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# CORS (your frontend URL)
CORS_ORIGIN=https://yourdomain.com

# Optional: Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

**Save:** `Ctrl+X`, `Y`, `Enter`

**Secure the file:**

```bash
chmod 600 .env
```

---

## 5️⃣ PM2 Configuration

### Create PM2 Ecosystem File

```bash
cd ~/quiz-game-backend
nano ecosystem.config.js
```

**Add:**

```javascript
module.exports = {
  apps: [
    {
      name: 'quiz-backend',
      script: './dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

### Create Logs Directory

```bash
mkdir -p logs
```

### Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs quiz-backend

# Save PM2 config
pm2 save

# Setup auto-start on boot
pm2 startup
# Copy and run the command shown
```

---

## 6️⃣ Nginx Setup (Optional)

### Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/quiz-backend
```

**Add:**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or VPS IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/quiz-backend /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 7️⃣ Update Workflow

### Quick Update Script

**Create on local machine:**

```bash
# File: deploy.sh
#!/bin/bash

echo "🚀 Deploying to VPS..."

# 1. Build locally
echo "📦 Building..."
npm run build --workspace=@quiz-game/backend

# 2. Copy to VPS
echo "📤 Uploading..."
cd apps/backend
scp -r dist package.json user@your-vps-ip:~/quiz-game-backend/

# 3. Restart on VPS
echo "🔄 Restarting..."
ssh user@your-vps-ip "cd ~/quiz-game-backend && pm2 restart quiz-backend"

echo "✅ Deployment complete!"
```

**Make executable:**

```bash
chmod +x deploy.sh
```

**Use:**

```bash
./deploy.sh
```

### Manual Update Steps

```bash
# 1. Build locally
npm run build --workspace=@quiz-game/backend

# 2. Copy to VPS
cd apps/backend
scp -r dist user@your-vps-ip:~/quiz-game-backend/

# 3. Restart on VPS
ssh user@your-vps-ip "pm2 restart quiz-backend"
```

---

## 8️⃣ Useful Commands

### PM2 Commands

```bash
# Status
pm2 status

# Logs
pm2 logs quiz-backend
pm2 logs quiz-backend --lines 100

# Restart
pm2 restart quiz-backend

# Stop
pm2 stop quiz-backend

# Monitor
pm2 monit
```

### Check Application

```bash
# Check if running
curl http://localhost:3000/api/health

# Or from outside
curl http://your-vps-ip/api/health
```

### View Logs

```bash
# PM2 logs
pm2 logs quiz-backend

# Or direct file
tail -f ~/quiz-game-backend/logs/out.log
tail -f ~/quiz-game-backend/logs/err.log
```

---

## 9️⃣ Troubleshooting

### App Won't Start

```bash
# Check PM2 logs
pm2 logs quiz-backend --err

# Common issues:
# - Database connection failed → Check .env DATABASE_* variables
# - Port in use → Change PORT in .env
# - Missing dependencies → Run npm install
```

### Database Connection Issues

```bash
# Test connection from VPS
psql -h db.your-project.supabase.co -U postgres -d postgres

# Check .env file
cat .env | grep DATABASE

# Verify SSL requirement
# Some databases require SSL=true
```

### Can't Access from Outside

```bash
# Check if app is running
pm2 status

# Check if listening on correct port
sudo lsof -i :3000

# Check firewall
sudo ufw status

# Check Nginx (if using)
sudo nginx -t
sudo systemctl status nginx
```

---

## 🔟 Production Checklist

### Before Deployment

- [ ] Build succeeds locally
- [ ] .env file configured with production values
- [ ] Database connection tested
- [ ] JWT_SECRET is strong and unique
- [ ] CORS_ORIGIN set to your frontend URL

### After Deployment

- [ ] Application starts successfully
- [ ] Health endpoint responds: `/api/health`
- [ ] Database connection works
- [ ] PM2 auto-restart configured
- [ ] Logs are being written
- [ ] Firewall configured

### Security

- [ ] .env file permissions: `chmod 600 .env`
- [ ] Firewall enabled
- [ ] SSH key-based auth (disable password)
- [ ] Regular system updates
- [ ] Strong database password

---

## 📁 File Structure on VPS

```
~/quiz-game-backend/
├── dist/                  # Built JavaScript files
│   ├── main.js
│   └── ...
├── node_modules/          # Production dependencies
├── logs/                  # Application logs
│   ├── out.log
│   ├── err.log
│   └── combined.log
├── .env                   # Environment variables
├── ecosystem.config.js    # PM2 configuration
├── package.json
└── package-lock.json
```

---

## 🎯 Quick Start Summary

```bash
# === LOCAL ===
# 1. Build
npm run build --workspace=@quiz-game/backend

# 2. Copy to VPS
cd apps/backend
scp -r dist package.json user@vps:~/quiz-game-backend/

# === VPS ===
# 3. Install dependencies
ssh user@vps
cd ~/quiz-game-backend
npm install --production

# 4. Create .env
nano .env  # Add your config

# 5. Start with PM2
pm2 start ecosystem.config.js
pm2 save

# 6. Test
curl http://localhost:3000/api/health
```

---

## 🔗 External Database Examples

### Supabase

```env
DATABASE_HOST=db.your-project.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=postgres
DATABASE_SSL=true
```

### Railway

```env
# Railway provides DATABASE_URL
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Or individual vars
DATABASE_HOST=containers-us-west-xxx.railway.app
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=xxx
DATABASE_NAME=railway
```

### Neon

```env
DATABASE_HOST=ep-xxx.us-east-2.aws.neon.tech
DATABASE_PORT=5432
DATABASE_USER=your-user
DATABASE_PASSWORD=xxx
DATABASE_NAME=neondb
DATABASE_SSL=true
```

---

## 📊 Monitoring

### Check Application Health

```bash
# From VPS
curl http://localhost:3000/api/health

# From outside
curl http://your-domain.com/api/health
```

### Monitor Resources

```bash
# PM2 monitoring
pm2 monit

# System resources
htop  # Install: sudo apt install htop

# Disk space
df -h

# Memory
free -h
```

---

## 🎉 Done!

Your backend is now running on VPS with external database!

**Access your API:**

- `http://your-vps-ip:3000/api` (direct)
- `http://your-domain.com/api` (with Nginx)

**Next steps:**

1. Setup SSL certificate (if using domain)
2. Configure monitoring
3. Setup automated backups
4. Deploy frontend

**Need help?** Check logs with `pm2 logs quiz-backend`
