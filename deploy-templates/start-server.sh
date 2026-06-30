#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "فایل .env یافت نشد. ابتدا env.example را کپی کنید:"
  echo "  cp env.example .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

export NODE_ENV="${NODE_ENV:-production}"
export DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-server}"
export SERVE_FRONTEND="${SERVE_FRONTEND:-true}"

if [[ ! -d backend/node_modules ]]; then
  echo ">> نصب وابستگی‌های بک‌اند..."
  npm ci --omit=dev --prefix backend
fi

STANDALONE_DIR="$ROOT/.next/standalone"
if [[ ! -f "$STANDALONE_DIR/node_modules/next/package.json" ]]; then
  echo "خطا: ماژول next در .next/standalone/node_modules یافت نشد."
  echo "این معمولاً یعنی دیپلوی قدیمی است. روی ماشین بیلد اجرا کنید:"
  echo "  npm run deploy:push"
  echo "سپس روی سرور:"
  echo "  ./server-update.sh"
  exit 1
fi

mkdir -p uploads backend/uploads

echo ">> راه‌اندازی EasyStock (server mode)..."
exec node backend/dist/server.js
