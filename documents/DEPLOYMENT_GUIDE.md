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
2. **Get commit info** - Lấy thông tin commit (hash, branch, message)
3. **Setup SSH** - Cấu hình SSH key
4. **Deploy to VPS** - Thực hiện deployment:
   - Pull latest code
   - Install dependencies
   - Build applications
   - Restart PM2 services
5. **Verify deployment** - Kiểm tra PM2 status và logs

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

# Git
sudo apt-get install -y git
```

### 2. Clone repository

```bash
cd /home/ubuntu
git clone git@github.com:username/fengshui-trainer.git
cd fengshui-trainer
```

### 3. Cấu hình PM2

Tạo file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './apps/backend',
      script: 'npm',
      args: 'run start:prod',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'admin',
      cwd: './apps/admin',
      script: 'npx',
      args: 'serve -s dist -l 3001',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

### 4. Setup PM2 startup

```bash
pm2 startup
pm2 save
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
# SSH vào VPS và check logs
ssh user@vps-host
cd /path/to/project
npm run build
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

### Git Pull Failed

```bash
# Reset local changes
git reset --hard origin/main

# Hoặc stash changes
git stash
git pull origin main
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
