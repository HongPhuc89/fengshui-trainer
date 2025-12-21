# Quick Fix for Production Server

## Immediate Fix (On Server)

### ⚡ QUICKEST FIX - Create Symlink (Recommended)

If config files exist in `/var/www/quiz-game/current/dist/config/` but app can't find them:

```bash
# On server
cd /var/www/quiz-game/current
ln -sf dist/config config
pm2 restart quiz-game-api
# or
sudo systemctl restart quiz-game
```

This creates a symbolic link so the config library can find the files.

### Option 1: Copy config directory manually

```bash
# On your local machine, from the quiz_game directory
cd /path/to/quiz_game
scp -r config ubuntu@your-server:/var/www/quiz-game/current/

# Then on server, restart the application
ssh ubuntu@your-server
cd /var/www/quiz-game/current
pm2 restart quiz-game-api
# or
sudo systemctl restart quiz-game
```

### Option 2: Set environment variables directly

If you can't copy the config files, set all required environment variables:

```bash
# On server
cd /var/www/quiz-game/current

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
APP_PORT=3000
APP_PREFIX=api
APP_ENV=production

DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=quiz_game

JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret
REFRESH_TOKEN_EXPIRES_IN=30d

SUPPRESS_NO_CONFIG_WARNING=true
EOF

# Load environment variables and start
export $(cat .env | xargs)
node dist/src/main.js
```

### Option 3: Use PM2 ecosystem file

```bash
# On server
cd /var/www/quiz-game/current

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'quiz-game-api',
    script: 'dist/src/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      APP_PORT: 3000,
      APP_PREFIX: 'api',
      APP_ENV: 'production',
      DB_HOST: 'your-db-host',
      DB_PORT: 5432,
      DB_USERNAME: 'your-db-user',
      DB_PASSWORD: 'your-db-password',
      DB_DATABASE: 'quiz_game',
      JWT_SECRET: 'your-jwt-secret',
      JWT_EXPIRES_IN: '7d',
      REFRESH_TOKEN_SECRET: 'your-refresh-token-secret',
      REFRESH_TOKEN_EXPIRES_IN: '30d',
      SUPPRESS_NO_CONFIG_WARNING: 'true'
    }
  }]
};
EOF

# Start with PM2
pm2 delete quiz-game-api
pm2 start ecosystem.config.js
pm2 save
```

## Verify

```bash
# Check if app is running
pm2 status
# or
sudo systemctl status quiz-game

# Check logs
pm2 logs quiz-game-api
# or
sudo journalctl -u quiz-game -f

# Test the API
curl http://localhost:3000/api/health
```
