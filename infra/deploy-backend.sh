#!/usr/bin/env bash
# deploy-backend.sh — Deploy backend lên VPS
# Usage: bash infra/deploy-backend.sh <branch>

set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="/srv/fengshui"
BACKEND_DIR="$APP_DIR/src/backend"
VENV="$APP_DIR/.venv"

echo "============================================"
echo " Backend Deploy — branch: $BRANCH"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"

echo "==> [1/4] Git pull..."
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> [2/4] Cài Python dependencies..."
"$VENV/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"

echo "==> [3/4] Django migrate..."
cd "$BACKEND_DIR"
"$VENV/bin/python" manage.py migrate --noinput

echo "==> [4/4] Django collectstatic..."
"$VENV/bin/python" manage.py collectstatic --noinput --clear

echo "==> Reload services..."
sudo systemctl reload-or-restart fengshui-gunicorn
sudo systemctl reload-or-restart fengshui-celery-worker
sudo systemctl reload-or-restart fengshui-celery-beat

echo "============================================"
echo " Backend deploy hoàn tất!"
echo " Gunicorn : $(sudo systemctl is-active fengshui-gunicorn)"
echo " Celery   : $(sudo systemctl is-active fengshui-celery-worker)"
echo " Beat     : $(sudo systemctl is-active fengshui-celery-beat)"
echo "============================================"
