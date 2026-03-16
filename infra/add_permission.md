sudo visudo -f /etc/sudoers.d/fengshui

content:
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload-or-restart fengshui-gunicorn
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload-or-restart fengshui-celery-worker
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload-or-restart fengshui-celery-beat
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl is-active fengshui-gunicorn
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl is-active fengshui-celery-worker
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl is-active fengshui-celery-beat
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop fengshui-celery-beat
fengshui ALL=(ALL) NOPASSWD: /usr/bin/systemctl start fengshui-celery-beat
