# Deployment Guide

## Prerequisites

1. Node.js 18+ installed on server
2. PostgreSQL database
3. PM2 or similar process manager

## Deployment Steps

### 1. Build the application

```bash
cd quiz_game
npm run build
```

### 2. Copy files to server

Copy the following to your server (e.g., `/var/www/quiz-game/current`):

- `apps/backend/dist/` → `/var/www/quiz-game/current/dist/`
- `apps/backend/package.json` → `/var/www/quiz-game/current/package.json`
- `apps/backend/package-lock.json` → `/var/www/quiz-game/current/package-lock.json`
- `config/` → `/var/www/quiz-game/current/config/`
- `apps/backend/node_modules/` (or run `npm ci --production` on server)

### 3. Set environment variables

Create a `.env` file or set environment variables on the server:

```bash
# Application
export NODE_ENV=production
export APP_PORT=3000
export APP_PREFIX=api
export APP_ENV=production

# Database
export DB_HOST=your-db-host
export DB_PORT=5432
export DB_USERNAME=your-db-user
export DB_PASSWORD=your-db-password
export DB_DATABASE=quiz_game

# JWT
export JWT_SECRET=your-super-secret-jwt-key-change-this
export JWT_EXPIRES_IN=7d
export REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-this
export REFRESH_TOKEN_EXPIRES_IN=30d

# Supabase (if using)
export SUPABASE_URL=your-supabase-url
export SUPABASE_KEY=your-supabase-key
```

### 4. Install dependencies (if not copied)

```bash
cd /var/www/quiz-game/current
npm ci --production
```

### 5. Run migrations

```bash
cd /var/www/quiz-game/current
npm run migration:run
```

### 6. Start the application

Using PM2:

```bash
pm2 start dist/src/main.js --name quiz-game-api
pm2 save
pm2 startup
```

Or using systemd:

Create `/etc/systemd/system/quiz-game.service`:

```ini
[Unit]
Description=Quiz Game API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/quiz-game/current
Environment=NODE_ENV=production
EnvironmentFile=/var/www/quiz-game/.env
ExecStart=/usr/bin/node dist/src/main.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable quiz-game
sudo systemctl start quiz-game
sudo systemctl status quiz-game
```

## Troubleshooting

### Config not found error

If you see "No configurations found in configuration directory", ensure:

1. The `config/` directory exists in `/var/www/quiz-game/current/`
2. Environment variable `NODE_CONFIG_DIR` is set correctly (optional):
   ```bash
   export NODE_CONFIG_DIR=/var/www/quiz-game/current/config
   ```

### Database connection error

Ensure all database environment variables are set correctly and the database is accessible from the server.

### Port already in use

Change the `APP_PORT` environment variable to a different port.

## Nginx Configuration (Optional)

If using Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Health Check

Check if the API is running:

```bash
curl http://localhost:3000/api/health
```
