#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo ">> دریافت آخرین دیپلوی از git..."
git fetch origin "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

echo ">> نصب/به‌روزرسانی وابستگی‌های بک‌اند..."
npm ci --omit=dev --prefix backend

if command -v pm2 >/dev/null 2>&1; then
  echo ">> ری‌استارت pm2..."
  pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
else
  echo ">> pm2 نصب نیست — سرور را دستی ری‌استارت کنید:"
  echo "   ./start-server.sh"
fi

if [[ -f deploy-info.json ]]; then
  echo ">> deploy-info.json:"
  cat deploy-info.json
fi
