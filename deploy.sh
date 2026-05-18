#!/bin/bash

DEPLOY_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DEPLOY_DIR"

echo "=== Daily - Deployment Script ==="

echo "[1/6] Installing server dependencies..."
cd server
npm install --production
cd ..

echo "[2/6] Building web client..."
cd web
npm install
npm run build
mkdir -p /var/www/daily
cp -r dist/* /var/www/daily/
cd ..

echo "[3/6] Building admin panel..."
cd admin
npm install
npm run build
mkdir -p /var/www/daily/admin
cp -r dist/* /var/www/daily/admin/
cd ..

echo "[4/6] Building WeChat mini-program..."
cd miniapp
npm install
npm run build:mp-weixin
echo "Mini-program build output: miniapp/dist/build/mp-weixin/"
cd ..

echo "[5/6] Configuring PM2..."
cd server
mkdir -p logs
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
pm2 delete daily-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
cd ..

echo "[6/6] Configuring Nginx..."
if [ -f /etc/nginx/sites-available/daily.conf ]; then
    echo "Nginx config already exists, skipping"
else
    cp nginx/daily.conf /etc/nginx/sites-available/daily.conf
    ln -sf /etc/nginx/sites-available/daily.conf /etc/nginx/sites-enabled/daily.conf
    nginx -t && systemctl reload nginx
fi

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "IMPORTANT: Please configure the following before production use:"
echo "1. Set environment variables: JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD"
echo "2. Update server_name in nginx/daily.conf"
echo "3. Update AppID in miniapp/src/manifest.json"
echo "4. Configure CORS_ORIGIN environment variable"
