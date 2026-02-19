# Deployment Guide - Feng Shui Learning Platform

## Document Information
- **Project**: Thiên Thư Deployment
- **Version**: 1.0
- **Last Updated**: 2026-02-17

---

## Infrastructure Requirements

### Production Server Specifications

**Recommended VPS:**
- **Provider**: Hetzner Cloud (CPX21)
- **CPU**: 3 vCPU
- **RAM**: 4GB
- **Storage**: 80GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: 10Gbit connection

**Estimated Monthly Cost**: ~$8-10 USD (VPS) + Supabase (Free/$25)

---

## Docker Setup

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Self-hosted Postgres removed - using Supabase
  # (No changes needed for Redis or Nginx service structure)

  redis:
    image: redis:7-alpine
    container_name: fengshui_redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  django:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fengshui_django
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
    environment:
      DATABASE_URL: ${SUPABASE_DB_URL}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      DEBUG: "False"
      ALLOWED_HOSTS: ${ALLOWED_HOSTS}
      BUNNY_STREAM_API_KEY: ${BUNNY_STREAM_API_KEY}
      BUNNY_STREAM_SECRET: ${BUNNY_STREAM_SECRET}
      BUNNY_STREAM_LIBRARY_ID: ${BUNNY_STREAM_LIBRARY_ID}
      BUNNY_STREAM_HOSTNAME: ${BUNNY_STREAM_HOSTNAME}
    volumes:
      - ./backend:/app
      - media_files:/app/media
      - static_files:/app/staticfiles
    ports:
      - "8000:8000"
    depends_on:
      - redis
    restart: unless-stopped

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fengshui_celery
    command: celery -A config worker -l info --concurrency=2
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
    volumes:
      - ./backend:/app
      - media_files:/app/media
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fengshui_celery_beat
    command: celery -A config beat -l info
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
    volumes:
      - ./backend:/app
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: fengshui_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - static_files:/usr/share/nginx/html/static:ro
      - media_files:/usr/share/nginx/html/media:ro
    depends_on:
      - django
    restart: unless-stopped

volumes:
  # postgres_data volume removed
  redis_data:
  media_files:
  static_files:
```

---

## Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## Nginx Configuration

```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;
    
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.fengshui-trainer.com;
        return 301 https://$server_name$request_uri;
    }
    
    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name api.fengshui-trainer.com;
        
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        # API endpoints
        location /api/ {
            proxy_pass http://django:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }
        
        # Admin
        location /admin/ {
            proxy_pass http://django:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Static files
        location /static/ {
            alias /usr/share/nginx/html/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
        
        # Media files
        location /media/ {
            alias /usr/share/nginx/html/media/;
            expires 7d;
            add_header Cache-Control "public";
        }
    }
}
```

---

## Environment Variables

```bash
# .env.production
# Database (Supabase)
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:6379/postgres
DB_PASSWORD=<supbase_password_for_reference>

# Redis
REDIS_PASSWORD=<strong_password>

# Django
SECRET_KEY=<generate_secret_key>
DEBUG=False
ALLOWED_HOSTS=api.fengshui-trainer.com,fengshui-trainer.com

# Bunny Stream
BUNNY_STREAM_API_KEY=<your_api_key>
BUNNY_STREAM_SECRET=<your_secret>
BUNNY_STREAM_LIBRARY_ID=<library_id>
BUNNY_STREAM_HOSTNAME=<hostname>

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=<email>
EMAIL_HOST_PASSWORD=<app_password>

# Monitoring
SENTRY_DSN=https://[KEY]@sentry.io/[PROJECT]
```

---

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Create app directory
sudo mkdir -p /opt/fengshui-trainer
cd /opt/fengshui-trainer
```

### 2. Clone Repository

```bash
git clone https://github.com/your-org/fengshui-trainer.git .
```

### 3. Configure Environment

```bash
# Copy environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot -y

# Generate certificate
sudo certbot certonly --standalone -d api.fengshui-trainer.com

# Copy certificates
sudo cp /etc/letsencrypt/live/api.fengshui-trainer.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/api.fengshui-trainer.com/privkey.pem nginx/ssl/
```

### 5. Build and Start

```bash
# Build images
docker compose -f docker-compose.yml build

# Start services
docker compose -f docker-compose.yml up -d

# Run migrations
docker compose exec django python manage.py migrate

# Create superuser
docker compose exec django python manage.py createsuperuser

# Collect static files
docker compose exec django python manage.py collectstatic --noinput
```

### 6. Verify Deployment

```bash
# Check services
docker compose ps

# Check logs
docker compose logs -f django

# Test API
curl https://api.fengshui-trainer.com/api/health/
```

---

## Database Backup

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
CONTAINER="fengshui_postgres"

mkdir -p $BACKUP_DIR

# Backup database
docker exec $CONTAINER pg_dump -U fengshui_user fengshui_db > \
    "$BACKUP_DIR/backup_$DATE.sql"

# Compress
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Media Backup
# Ensure the `/media/` folder is backed up regularly to an offsite location.

# Delete local backups older than 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### Cron Job

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/fengshui-trainer/scripts/backup.sh
```

---

## Monitoring

### Health Check Endpoint

```python
# backend/health/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import connection

@api_view(['GET'])
def health_check(request):
    try:
        # Check database
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        return Response({
            'status': 'healthy',
            'database': 'connected',
        })
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e),
        }, status=500)
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

Configure to check: `https://api.fengshui-trainer.com/api/health/`

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/fengshui-trainer
            git pull origin main
            docker compose -f docker-compose.yml build
            docker compose -f docker-compose.yml up -d
            docker compose exec -T django python manage.py migrate
            docker compose exec -T django python manage.py collectstatic --noinput
```

---

## Mobile App Deployment

# Bunny Stream
Bunny Stream is used for video transcoding and delivery.

1. **Create Storage Zone** (if required by Bunny Stream direct upload).
2. **Create Pull Zone** (standard setup).
3. **Configure Security**:
   - Enable Token Authentication.
   - Set up allowed referrers (your domain).

### Flutter Build Commands

```bash
# Android
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release
```

### App Store Submission

1. **Android (Google Play)**
   - Build AAB: `flutter build appbundle`
   - Upload to Google Play Console
   - Complete store listing
   - Submit for review

2. **iOS (App Store)**
   - Build IPA: `flutter build ios --release`
   - Archive in Xcode
   - Upload via Xcode or Transporter
   - Submit for review

---

## Web App Deployment

### Build Vue.js App

```bash
cd web
npm run build
```

### Deploy to CDN/Hosting

**Option 1: Vercel**
```bash
vercel --prod
```

**Option 2: Netlify**
```bash
netlify deploy --prod
```

**Option 3: Self-hosted**
```nginx
server {
    listen 443 ssl http2;
    server_name app.fengshui-trainer.com;
    
    root /var/www/fengshui-web/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  django:
    deploy:
      replicas: 3
  
  celery:
    deploy:
      replicas: 2
```

### Load Balancer

Use Nginx or HAProxy to distribute traffic across multiple Django instances.

---

## Troubleshooting

### Common Issues

**Database connection failed:**
```bash
docker compose logs postgres
docker compose restart postgres
```

**Static files not loading:**
```bash
docker compose exec django python manage.py collectstatic --noinput
docker compose restart nginx
```

**Celery not processing tasks:**
```bash
docker compose logs celery
docker compose restart celery
```

---

## Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured (UFW)
- [ ] SSH key-based authentication only
- [ ] Database password strong and unique
- [ ] Django SECRET_KEY generated securely
- [ ] DEBUG=False in production
- [ ] ALLOWED_HOSTS configured correctly
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts configured
