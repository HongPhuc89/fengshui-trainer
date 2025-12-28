# 📝 Cách 2: Edit Local và Upload .env lên VPS

Cách này an toàn và dễ dàng hơn - bạn edit file .env trên máy local (Windows) rồi upload lên VPS.

## ⚡ Quick Start

### Bước 1: Tạo file .env.production

```bash
# Copy template
cp apps/backend/.env.production.example apps/backend/.env.production
```

### Bước 2: Edit file với editor yêu thích

Mở file `apps/backend/.env.production` bằng:

- VS Code
- Notepad++
- Notepad
- Bất kỳ editor nào

**Điền thông tin production:**

```env
# Server
PORT=3000
NODE_ENV=production

# Database (Supabase example)
DATABASE_HOST=db.abcxyz.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-actual-password
DATABASE_NAME=postgres
DATABASE_SSL=true

# JWT
JWT_SECRET=abc123xyz456...  # Generate: openssl rand -base64 32
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Supabase
SUPABASE_URL=https://abcxyz.supabase.co
SUPABASE_KEY=your-anon-key
```

### Bước 3: Upload lên VPS

```bash
npm run env:edit
```

Chọn option **4** (Upload local .env.production to VPS)

Hoặc manual:

```bash
scp apps/backend/.env.production user@vps:~/quiz-game-backend/.env
```

### Bước 4: Restart app

```bash
ssh user@vps "pm2 restart quiz-backend"
```

Hoặc script sẽ tự hỏi bạn có muốn restart không.

---

## 📋 Chi Tiết Từng Bước

### 1. Tạo File .env.production

**Windows Command Prompt:**

```cmd
copy apps\backend\.env.production.example apps\backend\.env.production
```

**PowerShell:**

```powershell
Copy-Item apps/backend/.env.production.example apps/backend/.env.production
```

**Git Bash:**

```bash
cp apps/backend/.env.production.example apps/backend/.env.production
```

### 2. Edit File

**Mở bằng VS Code:**

```bash
code apps/backend/.env.production
```

**Hoặc click chuột phải → Open with → VS Code**

**Điền các giá trị:**

#### Database (Supabase)

1. Vào https://app.supabase.com
2. Chọn project
3. Settings → Database
4. Copy:
   - Host: `db.xxxxx.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: (click "Show" để xem)

```env
DATABASE_HOST=db.xxxxx.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password-here
DATABASE_NAME=postgres
DATABASE_SSL=true
```

#### JWT Secret

**Generate strong secret:**

```bash
# Git Bash
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copy kết quả vào:

```env
JWT_SECRET=paste-generated-secret-here
```

#### CORS Origin

```env
# Single domain
CORS_ORIGIN=https://yourdomain.com

# Multiple domains
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com
```

#### Supabase Storage

1. Vào https://app.supabase.com
2. Settings → API
3. Copy:
   - URL: `https://xxxxx.supabase.co`
   - anon/public key

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key-here
```

### 3. Upload lên VPS

**Option A: Dùng npm script (Recommended)**

```bash
npm run env:edit
```

Menu hiện ra:

```
Choose an option:
1) Edit .env on VPS (nano)
2) Edit .env on VPS (vi)
3) View current .env
4) Upload local .env.production to VPS  ← Chọn cái này
5) Download VPS .env to local
Enter choice [1-5]: 4
```

Nhập `4` và Enter.

Script sẽ:

- ✅ Upload file lên VPS
- ✅ Hỏi có muốn restart không
- ✅ Restart PM2 nếu chọn yes

**Option B: Manual SCP**

```bash
# Windows (Git Bash)
scp apps/backend/.env.production user@your-vps-ip:~/quiz-game-backend/.env

# Restart
ssh user@your-vps-ip "pm2 restart quiz-backend"
```

### 4. Verify

**Check app status:**

```bash
ssh user@vps "pm2 status"
```

**Check logs:**

```bash
ssh user@vps "pm2 logs quiz-backend --lines 20"
```

**Test API:**

```bash
curl http://your-vps-ip:3000/api/health
```

---

## 🔄 Update Workflow

Khi cần thay đổi environment variables:

```
1. Edit apps/backend/.env.production locally
   ↓
2. npm run env:edit → option 4
   ↓
3. Restart? y
   ↓
4. Done! ✅
```

**Example: Update database password**

1. Open `apps/backend/.env.production` in VS Code
2. Change `DATABASE_PASSWORD=old` to `DATABASE_PASSWORD=new`
3. Save file
4. Run `npm run env:edit`
5. Choose option 4
6. Restart when prompted

---

## 🎯 Common Tasks

### Change Database

```bash
# 1. Edit local file
code apps/backend/.env.production

# 2. Update DATABASE_* variables
DATABASE_HOST=new-host
DATABASE_PASSWORD=new-password

# 3. Upload
npm run env:edit → option 4

# 4. Restart
y
```

### Add New Variable

```bash
# 1. Edit local file
code apps/backend/.env.production

# 2. Add new variable
NEW_FEATURE_FLAG=true

# 3. Upload
npm run env:edit → option 4

# 4. Restart
y
```

### Switch to Different Database

```bash
# 1. Edit local file
# Change from Supabase to Railway

# Before:
DATABASE_HOST=db.supabase.co
DATABASE_PASSWORD=supabase-pass

# After:
DATABASE_URL=postgresql://user:pass@railway-host:5432/db

# 2. Upload and restart
npm run env:edit → option 4 → y
```

---

## 💾 Backup & Restore

### Backup Current VPS .env

```bash
npm run env:edit
# Choose option 5
# Saves to: vps-env-backup.txt
```

**Or manual:**

```bash
scp user@vps:~/quiz-game-backend/.env ./vps-env-backup-$(date +%Y%m%d).txt
```

### Restore from Backup

```bash
# 1. Copy backup to .env.production
cp vps-env-backup.txt apps/backend/.env.production

# 2. Upload
npm run env:edit → option 4
```

---

## 🔐 Security Best Practices

### File Permissions

**.env.production is gitignored:**

```gitignore
# In .gitignore
**/.env.production
```

**Never commit:**

- ❌ .env.production
- ❌ vps-env-backup.txt
- ✅ .env.production.example (OK to commit)

### Strong Secrets

**Generate JWT_SECRET:**

```bash
openssl rand -base64 32
```

**Generate random password:**

```bash
openssl rand -base64 24
```

### Secure Storage

**Local:**

- Keep .env.production in project folder
- Don't share via email/chat
- Use password manager for backups

**VPS:**

- File permissions: `chmod 600 .env`
- Only readable by owner
- Not accessible via web

---

## 🐛 Troubleshooting

### Upload Failed

**Error: Permission denied**

```bash
# Check SSH access
ssh user@vps "ls -la ~/quiz-game-backend"

# Check directory exists
ssh user@vps "mkdir -p ~/quiz-game-backend"
```

**Error: File not found**

```bash
# Make sure file exists locally
ls apps/backend/.env.production

# If not, create it
cp apps/backend/.env.production.example apps/backend/.env.production
```

### App Won't Start After Upload

**Check logs:**

```bash
ssh user@vps "pm2 logs quiz-backend --err"
```

**Common issues:**

- Missing required variable
- Wrong database password
- Invalid JWT_SECRET format
- Wrong CORS_ORIGIN

**Fix:**

1. Edit .env.production locally
2. Fix the issue
3. Upload again
4. Restart

### Database Connection Failed

**Check variables:**

```bash
# View current .env on VPS
npm run env:edit → option 3

# Look for:
DATABASE_HOST=...
DATABASE_PASSWORD=...
DATABASE_SSL=...
```

**Test connection:**

```bash
ssh user@vps "cd ~/quiz-game-backend && node -e \"console.log(process.env.DATABASE_HOST)\""
```

---

## 📊 Comparison

### Cách 1: SSH và Edit Trực Tiếp

**Pros:**

- Direct editing
- No file transfer

**Cons:**

- ❌ Need to know nano/vi
- ❌ Hard to edit on Windows
- ❌ No local backup
- ❌ Typo-prone

### Cách 2: Edit Local và Upload ✅

**Pros:**

- ✅ Edit with familiar editor (VS Code)
- ✅ Easy on Windows
- ✅ Local backup automatically
- ✅ Can use copy/paste
- ✅ Syntax highlighting
- ✅ Version control (gitignored)

**Cons:**

- Need SCP access (already have)

---

## 🎉 Summary

**Cách 2 is the best choice for:**

- ✅ Windows users
- ✅ VS Code users
- ✅ People who want safety
- ✅ Teams (can share .env.production.example)

**Workflow:**

```
Edit locally → Upload → Restart → Done!
```

**One command:**

```bash
npm run env:edit
```

**Simple and safe!** 🚀
