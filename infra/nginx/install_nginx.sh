sudo cp /srv/fengshui/infra/nginx/fengshui.conf /etc/nginx/sites-enabled/fengshui
sudo cp /srv/fengshui/infra/nginx/huyenhoc.conf /etc/nginx/sites-enabled/huyenhoc
sudo nginx -t && sudo systemctl reload nginx
