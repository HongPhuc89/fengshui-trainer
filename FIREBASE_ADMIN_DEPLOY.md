# 🚀 Deploy Admin Dashboard to Firebase Hosting

Deploy React Admin dashboard to Firebase Hosting with custom domain support.

## 📋 Prerequisites

- Firebase account
- Firebase CLI installed
- Admin dashboard built successfully
- Backend API running at `https://book-api.hongphuc.top`

## ⚡ Quick Deploy

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase

```bash
# In project root
firebase init hosting

# Choose:
# - Use an existing project or create new one
# - Public directory: apps/admin/dist
# - Configure as single-page app: Yes
# - Set up automatic builds: No
# - Don't overwrite index.html
```

### 4. Configure Environment

Create `apps/admin/.env.production`:

```env
VITE_API_URL=https://book-api.hongphuc.top
```

### 5. Build Admin

```bash
npm run build --workspace=@quiz-game/admin
```

### 6. Deploy

```bash
firebase deploy --only hosting
```

## 📝 Detailed Setup

### Step 1: Install Firebase CLI

```bash
# Install globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

### Step 2: Login

```bash
firebase login

# This will open browser for authentication
# Login with your Google account
```

### Step 3: Initialize Project

```bash
# Navigate to project root
cd d:\code\2025\quiz_game\quiz_game

# Initialize Firebase
firebase init

# Select:
# ? Which Firebase features do you want to set up?
#   ◉ Hosting: Configure files for Firebase Hosting

# ? Please select an option:
#   > Use an existing project (or create new)

# ? What do you want to use as your public directory?
#   > apps/admin/dist

# ? Configure as a single-page app?
#   > Yes

# ? Set up automatic builds and deploys with GitHub?
#   > No

# ? File apps/admin/dist/index.html already exists. Overwrite?
#   > No
```

### Step 4: Configure firebase.json

Firebase will create `firebase.json`. Update it:

```json
{
  "hosting": {
    "public": "apps/admin/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Step 5: Create Environment File

```bash
# Create production env
cp apps/admin/.env.example apps/admin/.env.production
```

**Edit `apps/admin/.env.production`:**

```env
# API Configuration
VITE_API_URL=https://book-api.hongphuc.top

# App Configuration
VITE_APP_NAME=Quiz Game Admin
VITE_APP_ENV=production
```

### Step 6: Build Admin Dashboard

```bash
# Build for production
npm run build --workspace=@quiz-game/admin

# Verify build
ls apps/admin/dist
# Should see: index.html, assets/, etc.
```

### Step 7: Test Locally (Optional)

```bash
# Serve locally to test
firebase serve --only hosting

# Open http://localhost:5000
```

### Step 8: Deploy to Firebase

```bash
# Deploy
firebase deploy --only hosting

# Output will show:
# ✔  Deploy complete!
# Hosting URL: https://your-project.web.app
```

## 🌐 Custom Domain Setup

### Option 1: Firebase Custom Domain

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `admin.hongphuc.top`)
4. Follow DNS setup instructions
5. Add DNS records to your domain provider

**DNS Records:**

```
Type: A
Name: admin
Value: (Firebase IP addresses provided)

Type: TXT
Name: admin
Value: (Verification code provided)
```

### Option 2: Cloudflare (Recommended)

If using Cloudflare:

1. Add CNAME record:

```
Type: CNAME
Name: admin
Target: your-project.web.app
Proxy: Enabled (Orange cloud)
```

2. SSL/TLS mode: Full

## 📦 Automated Deployment Script

Create `deploy-admin.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 Deploying Admin Dashboard to Firebase"
echo "=========================================="
echo ""

# 1. Build
echo "📦 Building admin..."
npm run build --workspace=@quiz-game/admin
echo "✓ Build complete"
echo ""

# 2. Deploy
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting
echo "✓ Deploy complete"
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Your admin dashboard is now live!"
echo ""
```

**Make executable:**

```bash
chmod +x deploy-admin.sh
```

**Use:**

```bash
./deploy-admin.sh
```

## 🔧 npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "admin:build": "npm run build --workspace=@quiz-game/admin",
    "admin:deploy": "npm run admin:build && firebase deploy --only hosting",
    "admin:serve": "firebase serve --only hosting"
  }
}
```

**Usage:**

```bash
# Build and deploy
npm run admin:deploy

# Test locally
npm run admin:serve
```

## 🎯 Environment Variables

### Development (.env.development)

```env
VITE_API_URL=http://localhost:3000
```

### Production (.env.production)

```env
VITE_API_URL=https://book-api.hongphuc.top
```

## 🔍 Verify Deployment

### Check Build

```bash
# Verify API URL in build
grep -r "book-api.hongphuc.top" apps/admin/dist/assets/*.js
```

### Test Endpoints

```bash
# After deployment, test:
curl https://your-project.web.app

# Should return HTML
```

### Test API Connection

Open browser console on deployed site:

```javascript
// Should show: https://book-api.hongphuc.top
console.log(import.meta.env.VITE_API_URL);
```

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf apps/admin/dist
rm -rf apps/admin/node_modules/.vite
npm run build --workspace=@quiz-game/admin
```

### API Not Connecting

Check `.env.production`:

```bash
cat apps/admin/.env.production
# Should have: VITE_API_URL=https://book-api.hongphuc.top
```

### 404 on Refresh

Ensure `firebase.json` has rewrite rule:

```json
{
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

### CORS Errors

Update backend CORS in `.env`:

```env
CORS_ORIGIN=https://your-project.web.app,https://admin.hongphuc.top
```

## 📊 Deployment Checklist

**Before Deploy:**

- [ ] Backend API is running
- [ ] `.env.production` configured
- [ ] Admin builds successfully
- [ ] Firebase project created
- [ ] Firebase CLI installed and logged in

**Deploy:**

- [ ] Run `npm run build --workspace=@quiz-game/admin`
- [ ] Run `firebase deploy --only hosting`
- [ ] Verify deployment URL

**After Deploy:**

- [ ] Test login functionality
- [ ] Test API endpoints
- [ ] Check browser console for errors
- [ ] Setup custom domain (optional)
- [ ] Update backend CORS if needed

## 🎉 Quick Start Summary

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize (one-time)
firebase init hosting

# 4. Configure environment
echo "VITE_API_URL=https://book-api.hongphuc.top" > apps/admin/.env.production

# 5. Build
npm run build --workspace=@quiz-game/admin

# 6. Deploy
firebase deploy --only hosting

# Done! 🎉
```

## 📚 Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Admin Deployment](https://marmelab.com/react-admin/Deployment.html)

---

**Your admin dashboard will be live at:**

- Default: `https://your-project.web.app`
- Custom: `https://admin.hongphuc.top` (after DNS setup)

**Backend API:**

- `https://book-api.hongphuc.top`

**Ready to deploy!** 🚀
