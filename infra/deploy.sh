#!/usr/bin/env bash
# deploy.sh — Deploy Fengshui Trainer lên VPS
# Chạy từ thư mục gốc project: sudo bash infra/deploy.sh
# Hoặc với user fengshui (bỏ sudo nếu không cần chown log dir)

set -euo pipefail

APP_DIR="/srv/fengshui"
BACKEND_DIR="$APP_DIR/src/backend"
FRONTEND_DIR="$APP_DIR/src/frontend"
VENV="$APP_DIR/.venv"
APP_USER="fengshui"
LOG_DIR="/var/log/fengshui"

echo "============================================"
echo " Fengshui Trainer — Deploy $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

# ── 1. Pull code mới nhất ──────────────────────
echo ""
echo "==> [1/6] Git pull..."
cd "$APP_DIR"
git pull --ff-only

# ── 2. Cài Python dependencies ─────────────────
echo ""
echo "==> [2/6] Cài Python dependencies..."
"$VENV/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"

# ── 3. Django migrate + collectstatic ─────────
echo ""
echo "==> [3/6] Django migrate..."
cd "$BACKEND_DIR"
"$VENV/bin/python" manage.py migrate --noinput

echo ""
echo "==> [4/6] Django collectstatic..."
"$VENV/bin/python" manage.py collectstatic --noinput --clear

# ── 4. Build Vue frontend ──────────────────────
echo ""
echo "==> [5/6] Build Vue frontend..."
cd "$FRONTEND_DIR"
npm ci --silent
npm run build

# ── 5. Reload services ────────────────────────
echo ""
echo "==> [6/6] Reload services..."
mkdir -p "$LOG_DIR"
chown "$APP_USER:$APP_USER" "$LOG_DIR" 2>/dev/null || true

systemctl reload-or-restart fengshui-gunicorn
systemctl reload-or-restart fengshui-celery-worker
systemctl reload-or-restart fengshui-celery-beat

# Reload nginx config (không restart để tránh downtime)
nginx -t && systemctl reload nginx

echo ""
echo "============================================"
echo " Deploy hoàn tất!"
echo " Gunicorn : $(systemctl is-active fengshui-gunicorn)"
echo " Celery   : $(systemctl is-active fengshui-celery-worker)"
echo " Beat     : $(systemctl is-active fengshui-celery-beat)"
echo " Nginx    : $(systemctl is-active nginx)"
echo "============================================"
