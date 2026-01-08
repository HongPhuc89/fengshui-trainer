# GitHub Actions Deployment Guide

Hướng dẫn cấu hình và sử dụng GitHub Actions để tự động deploy lên VPS.

## 📋 Mục lục

- [Cấu hình GitHub Secrets](#cấu-hình-github-secrets)
- [Workflow](#workflow)
- [Cách sử dụng](#cách-sử-dụng)
- [Troubleshooting](#troubleshooting)

## 🔐 Cấu hình GitHub Secrets

Truy cập **Settings → Secrets and variables → Actions** trên GitHub repository và thêm các secrets sau:

### Required Secrets

| Secret Name   | Description                    | Example                                  |
| ------------- | ------------------------------ | ---------------------------------------- |
| `VPS_SSH_KEY` | SSH private key để kết nối VPS | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_HOST`    | IP hoặc domain của VPS         | `192.168.1.100` hoặc `example.com`       |
| `VPS_USER`    | Username SSH                   | `ubuntu` hoặc `root`                     |
| `VPS_DIR`     | Đường dẫn project trên VPS     | `/home/ubuntu/fengshui-trainer`          |

### Tạo SSH Key

```bash
# Trên máy local
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/github_actions.pub user@vps-host

# Copy private key để thêm vào GitHub Secrets
cat ~/.ssh/github_actions
```

## 🔄 Workflow

Workflow được trigger khi:

1. **Push to main branch** - Tự động deploy khi merge PR vào main
2. **Manual trigger** - Chạy thủ công từ GitHub Actions tab

### Các bước trong workflow:

1. **Checkout code** - Clone repository
2. **Setup Node.js** - Cài đặt Node.js 20
3. **Get commit info** - Lấy thông tin commit (hash, branch, message)
4. **Install dependencies** - Install npm packages
   - Build backend (`apps/backend/dist`)
   - Copy config files vào dist
5. **Create deployment package:**
   - Backend dist + package.json
   - Config files
   - PM2 config
6. **Setup SSH** - Cấu hình SSH key
7. **Rsync to VPS:**
   - Backup deployment hiện tại
   - Upload backend dist
   - Upload config và PM2 config
8. **Install & Restart:**
   - Install production dependencies trên VPS
   - Restart PM2 services
9. **Verify deployment** - Kiểm tra PM2 status và logs

### ⚡ Lợi ích của cách deploy này:

- **Nhanh hơn** - Build trên GitHub runner (mạnh hơn VPS)
- **Tiết kiệm tài nguyên VPS** - Không cần build trên VPS
- **An toàn** - Tự động backup trước khi deploy
- **Nhỏ gọn** - Chỉ upload built files

## 🚀 Cách sử dụng

### Automatic Deployment (Push to main)

```bash
# Trên branch feature
git add .
git commit -m "feat: new feature"
git push origin feature-branch

# Tạo PR và merge vào main
# → GitHub Actions sẽ tự động deploy
```

### Manual Deployment

1. Truy cập **Actions** tab trên GitHub
2. Chọn workflow **Deploy to VPS**
3. Click **Run workflow**
4. Chọn environment (production/staging)
5. Click **Run workflow** để bắt đầu

## 📦 Cấu hình VPS

### 1. Cài đặt dependencies

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2
```

### 2. Tạo thư mục project

```bash
# Tạo thư mục cho project
sudo mkdir -p /home/ubuntu/fengshui-trainer
sudo chown ubuntu:ubuntu /home/ubuntu/fengshui-trainer
cd /home/ubuntu/fengshui-trainer

# Tạo cấu trúc thư mục
mkdir -p apps/backend config backups
```

### 3. Cấu hình .env files

Tạo các file `.env` cần thiết trên VPS:

```bash
# Backend .env
nano apps/backend/.env

# Admin .env (nếu cần)
nano apps/admin/.env
```

### 4. Cấu hình PM2

File `ecosystem.config.js` sẽ được upload tự động từ GitHub Actions.

### 5. Setup PM2 startup

```bash
pm2 startup
# Copy và chạy command được suggest
pm2 save
```

### 6. Cấu hình Nginx (Optional)

```nginx
# /etc/nginx/sites-available/fengshui-trainer
server {
    listen 80;
    server_name your-domain.com;

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin panel
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fengshui-trainer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 Troubleshooting

### SSH Connection Failed

```bash
# Kiểm tra SSH key
ssh -i ~/.ssh/github_actions user@vps-host

# Kiểm tra permissions
chmod 600 ~/.ssh/github_actions
chmod 644 ~/.ssh/github_actions.pub
```

### Build Failed

```bash
# Check GitHub Actions logs
# Actions tab → Select failed workflow → View logs

# Test build locally
npm ci
npm run build
```

### Rsync Failed

```bash
# Test SSH connection
ssh user@vps-host

# Test rsync manually
rsync -avz --dry-run local-file user@vps-host:/path/

# Check disk space on VPS
ssh user@vps-host "df -h"
```

### PM2 Not Restarting

```bash
# Kiểm tra PM2 status
pm2 list
pm2 logs

# Restart manually
pm2 restart all

# Hoặc start từ đầu
pm2 delete all
pm2 start ecosystem.config.js
```

### Backup and Rollback

```bash
# List backups
ssh user@vps-host "ls -lh /path/to/project/backups/"

# Rollback to previous version
ssh user@vps-host
cd /path/to/project
tar -xzf backups/backup-YYYYMMDD-HHMMSS.tar.gz
pm2 restart all
```

## 📊 Monitoring

### View deployment logs

```bash
# Trên GitHub
Actions tab → Select workflow run → View logs

# Trên VPS
pm2 logs
pm2 monit
```

### Check application status

```bash
ssh user@vps-host
pm2 list
pm2 show backend
pm2 show admin
```

## 🔒 Security Best Practices

1. **Không commit secrets** - Dùng GitHub Secrets
2. **Rotate SSH keys** - Thay đổi định kỳ
3. **Limit SSH access** - Chỉ cho phép GitHub Actions IP
4. **Use environment-specific configs** - Tách config cho production/staging
5. **Enable 2FA** - Bật 2FA cho GitHub account

## 📝 Notes

- Deployment chỉ chạy khi push vào `main` branch
- Có thể customize workflow cho staging environment
- PM2 sẽ tự động restart nếu app crash
- Logs được lưu tại `~/.pm2/logs/`
