sudo ln -s /srv/fengshui/infra/nginx/fengshui.conf /etc/nginx/sites-enabled/fengshui
sudo nginx -t && sudo systemctl reload nginx
