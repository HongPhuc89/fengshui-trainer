# 🚨 Production Config Error - SOLVED

## Problem

```
WARNING: No configurations found in configuration directory:/var/www/quiz-game/current/config
TypeError: Cannot read properties of undefined (reading 'port')
```

## Root Cause

The `config` library looks for config files in the `config/` directory at the application root, but when running from `dist/`, it can't find them.

## ✅ Solutions (Choose One)

### Solution 1: Use Latest Code (Recommended)

The code has been updated to automatically detect and set the correct config directory.

**Steps:**

1. Pull latest code
2. Rebuild: `npm run build`
3. Deploy the new `dist/` folder
4. Restart the app

The `main.ts` now automatically sets `NODE_CONFIG_DIR` to the correct path.

### Solution 2: Create Symlink (Quickest for Current Deployment)

```bash
cd /var/www/quiz-game/current
ln -sf dist/config config
pm2 restart quiz-game-api
```

### Solution 3: Set Environment Variable

```bash
export NODE_CONFIG_DIR=/var/www/quiz-game/current/dist/config
pm2 restart quiz-game-api --update-env
```

## Verification

```bash
# Check if config directory exists
ls -la /var/www/quiz-game/current/dist/config/

# Check if symlink exists (if using Solution 2)
ls -la /var/www/quiz-game/current/ | grep config

# Check app logs
pm2 logs quiz-game-api --lines 50

# Test API
curl http://localhost:3000/api/health
```

## Files Changed

- ✅ `apps/backend/src/main.ts` - Auto-detect config directory
- ✅ `apps/backend/package.json` - Added postbuild script to copy config
- ✅ `config/production.yaml` - Production config template
- ✅ `DEPLOYMENT.md` - Full deployment guide
- ✅ `QUICK_FIX.md` - Quick fixes for common issues

## Next Deployment

The build process now automatically:

1. Copies `config/` to `dist/config/` during build
2. Sets correct `NODE_CONFIG_DIR` at runtime

No manual intervention needed! 🎉
