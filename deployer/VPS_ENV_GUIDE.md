# 🔧 VPS Environment Management

Quick guide for managing .env file on VPS.

## ⚡ Quick Commands

### Edit .env on VPS

```bash
# Interactive menu
npm run env:edit

# Or direct SSH
ssh user@vps "nano ~/quiz-game-backend/.env"
```

## 📋 Menu Options

When you run `npm run env:edit`, you get:

```
1) Edit .env on VPS (nano)      - Open nano editor
2) Edit .env on VPS (vi)        - Open vi editor
3) View current .env            - Display current values
4) Upload local .env.production - Upload from local
5) Download VPS .env to local   - Backup to local
```

## 🎯 Common Tasks

### 1. Edit Database Connection

```bash
npm run env:edit
# Choose option 1 (nano)
# Edit DATABASE_* variables
# Save: Ctrl+X, Y, Enter
# Restart when prompted: y
```

### 2. Change JWT Secret

```bash
npm run env:edit
# Choose option 1
# Edit JWT_SECRET
# Save and restart
```

### 3. Update CORS Origin

```bash
npm run env:edit
# Choose option 1
# Edit CORS_ORIGIN
# Save and restart
```

### 4. View Current Config

```bash
npm run env:edit
# Choose option 3
# View all environment variables
```

## 📝 Manual Methods

### Method 1: SSH + Nano (Easiest)

```bash
# SSH to VPS
ssh user@vps

# Edit .env
cd ~/quiz-game-backend
nano .env

# Save: Ctrl+X, Y, Enter

# Restart
pm2 restart quiz-backend
```

### Method 2: SSH + Vi

```bash
ssh user@vps
cd ~/quiz-game-backend
vi .env

# Edit mode: i
# Save: Esc, :wq, Enter

pm2 restart quiz-backend
```

### Method 3: One-Line Edit

```bash
# Edit specific variable
ssh user@vps "sed -i 's/DATABASE_HOST=.*/DATABASE_HOST=new-host/' ~/quiz-game-backend/.env && pm2 restart quiz-backend"
```

### Method 4: Upload from Local

```bash
# Create .env.production locally
# File: apps/backend/.env.production

# Upload
scp apps/backend/.env.production user@vps:~/quiz-game-backend/.env

# Restart
ssh user@vps "pm2 restart quiz-backend"
```

## 🔐 Environment Variables

### Required Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database (External)
DATABASE_HOST=db.your-project.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=postgres
DATABASE_SSL=true

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Supabase (Optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## ⚠️ Important Notes

### After Editing .env

**Always restart the application:**

```bash
pm2 restart quiz-backend
```

**Or via npm script:**

```bash
ssh user@vps "pm2 restart quiz-backend"
```

### Security

**File permissions:**

```bash
# Check permissions
ssh user@vps "ls -la ~/quiz-game-backend/.env"

# Should be: -rw------- (600)

# Fix if needed
ssh user@vps "chmod 600 ~/quiz-game-backend/.env"
```

**Never commit .env:**

- ✅ .env is in .gitignore
- ✅ Use .env.example for templates
- ✅ Keep secrets secure

### Backup

**Download current .env:**

```bash
npm run env:edit
# Choose option 5
# Saves to: vps-env-backup.txt
```

**Or manual:**

```bash
scp user@vps:~/quiz-game-backend/.env ./vps-env-backup.txt
```

## 🔄 Workflow

### Update Environment Variable

```
1. npm run env:edit
   ↓
2. Choose option 1 (nano)
   ↓
3. Edit variable
   ↓
4. Save (Ctrl+X, Y, Enter)
   ↓
5. Restart? y
   ↓
6. Done! ✅
```

### Upload New Config

```
1. Create apps/backend/.env.production
   ↓
2. Add all production values
   ↓
3. npm run env:edit
   ↓
4. Choose option 4 (upload)
   ↓
5. Restart? y
   ↓
6. Done! ✅
```

## 🐛 Troubleshooting

### Can't Connect to Database

```bash
# Check database variables
npm run env:edit
# Option 3 (view)

# Look for:
# - DATABASE_HOST
# - DATABASE_PASSWORD
# - DATABASE_SSL
```

### App Won't Start

```bash
# Check logs
ssh user@vps "pm2 logs quiz-backend --err"

# Common issues:
# - Missing required variables
# - Wrong database credentials
# - Invalid JWT_SECRET
```

### Changes Not Applied

```bash
# Make sure you restarted
ssh user@vps "pm2 restart quiz-backend"

# Check if .env is loaded
ssh user@vps "pm2 show quiz-backend"
```

## 📚 Quick Reference

```bash
# Edit .env (interactive)
npm run env:edit

# Edit .env (direct)
ssh user@vps "nano ~/quiz-game-backend/.env"

# View .env
ssh user@vps "cat ~/quiz-game-backend/.env"

# Restart app
ssh user@vps "pm2 restart quiz-backend"

# Check logs
ssh user@vps "pm2 logs quiz-backend"

# Backup .env
scp user@vps:~/quiz-game-backend/.env ./backup.env
```

---

**Pro Tip:** Use `npm run env:edit` for the easiest experience! 🚀
