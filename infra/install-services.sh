#!/usr/bin/env bash
# install-services.sh — Copy systemd service files và enable auto-start
# Chạy trên VPS với sudo: sudo bash infra/install-services.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="/etc/systemd/system"
LOG_DIR="/var/log/fengshui"
APP_USER="fengshui"

echo "==> Tạo thư mục log..."
mkdir -p "$LOG_DIR"
chown "$APP_USER:$APP_USER" "$LOG_DIR"

echo "==> Copy service files vào $SYSTEMD_DIR..."
cp "$SCRIPT_DIR/systemd/fengshui-gunicorn.service"      "$SYSTEMD_DIR/"
cp "$SCRIPT_DIR/systemd/fengshui-celery-worker.service" "$SYSTEMD_DIR/"
cp "$SCRIPT_DIR/systemd/fengshui-celery-beat.service"   "$SYSTEMD_DIR/"

echo "==> Reload systemd daemon..."
systemctl daemon-reload

echo "==> Enable services (auto-start khi reboot)..."
systemctl enable fengshui-gunicorn
systemctl enable fengshui-celery-worker
systemctl enable fengshui-celery-beat

echo "==> Start services..."
systemctl start fengshui-gunicorn
systemctl start fengshui-celery-worker
systemctl start fengshui-celery-beat

echo ""
echo "==> Status:"
systemctl status fengshui-gunicorn      --no-pager -l
systemctl status fengshui-celery-worker --no-pager -l
systemctl status fengshui-celery-beat   --no-pager -l

echo ""
echo "Done! Các service đã được enable và start."
echo "Để xem log: sudo journalctl -u fengshui-gunicorn -f"
