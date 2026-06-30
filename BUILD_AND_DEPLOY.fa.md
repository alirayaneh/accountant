# راهنمای کامل بیلد، اجرا و دیپلوی EasyStock Accountant

این سند تمام حالت‌های اجرا، بیلد فرانت/بک، خروجی دسکتاپ (Electron) و دیپلوی سرور آنلاین را پوشش می‌دهد.

---

## فهرست

1. [ساختار پروژه و برنچ‌ها](#ساختار-پروژه-و-برنچ‌ها)
2. [پیش‌نیازها](#پیش‌نیازها)
3. [متغیرهای محیطی](#متغیرهای-محیطی)
4. [حالت‌های اجرا](#حالت‌های-اجرا)
5. [بیلد و خروجی‌ها](#بیلد-و-خروجی‌ها)
6. [دیپلوی سرور (الگوی CI/CD)](#دیپلوی-سرور-الگوی-cicd)
7. [راه‌اندازی اولیه سرور](#راه‌اندازی-اولیه-سرور)
8. [به‌روزرسانی سرور (Pull)](#به‌روزرسانی-سرور-pull)
9. [GitHub Actions](#github-actions)
10. [nginx (اختیاری)](#nginx-اختیاری)
11. [عیب‌یابی](#عیب‌یابی)

---

## ساختار پروژه و برنچ‌ها

| برنچ | کاربرد |
|------|--------|
| `main` | نسخه دسکتاپ (Electron). شامل لایسنس کلاینت، بدون سرویس صدور لایسنس |
| `server` | نسخه آنلاین. شامل superadmin، impersonation، صدور لایسنس دسکتاپ |

**ریپازیتوری‌ها:**

| ریپو | آدرس | محتوا |
|------|------|-------|
| سورس | `git@github.com:alirayaneh/accountant.git` | کد TypeScript/React |
| دیپلوی | `git@github.com:alirayaneh/accountant_deploy.git` | فقط خروجی بیلد (آرتifact) |

> فایل‌های بیلد (`release/`, `.next/`, `backend/dist/`) در ریپوی سورس commit **نمی‌شوند** — با یک دستور دوباره ساخته می‌شوند.

---

## پیش‌نیازها

### توسعه (لوکال)

- Node.js 20+
- npm 10+
- Git

### بیلد دسکتاپ (Linux AppImage)

- کتابخانه‌های electron-builder (معمولاً روی Ubuntu نصب است)

### بیلد دسکتاپ (Windows portable)

- Windows یا Wine + electron-builder

### سرور production

- Node.js 20+
- MySQL 8+
- (اختیاری) pm2، nginx

---

## متغیرهای محیطی

فایل‌های نمونه در ریشه پروژه:

| فایل | کاربرد |
|------|--------|
| `.env.example` | مرجع کلی همه متغیرها |
| `.env.server` | بیلد و دیپلوی سرور (`NEXT_PUBLIC_*` در زمان build embed می‌شوند) |
| `.env.electron` | بیلد Electron |
| `backend/.env` | اجرای dev بک‌اند |

### متغیرهای مهم فرانت (build-time)

```env
NEXT_PUBLIC_DEPLOYMENT_MODE=server      # فقط برنچ server
NEXT_PUBLIC_ALLOWED_STORAGE_TYPES=online
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_IS_ELECTRON=true           # فقط Electron
NEXT_PUBLIC_LOCAL_API_URL=http://127.0.0.1:43031
```

### متغیرهای مهم بک‌اند (runtime)

```env
DEPLOYMENT_MODE=server    # desktop | server
SERVE_FRONTEND=true       # فرانت + API روی یک پورت
PORT=4000
HOST=0.0.0.0
DB_TYPE=mysql
JWT_SECRET=...
SESSION_SECRET=...
SUPERADMIN_EMAILS=admin@example.com
LICENSE_SIGNING_SECRET=...   # فقط server
```

---

## حالت‌های اجرا

### ۱. توسعه — فرانت و بک جدا

**ترمینال ۱ — بک‌اند:**

```bash
cd backend
cp ../.env.example .env   # در صورت نیاز
npm install
npm run dev
```

بک‌اند: `http://localhost:4000`

**ترمینال ۲ — فرانت:**

```bash
npm install
npm run dev
```

فرانت: `http://localhost:9002`

در تنظیمات اپ، storage را روی SQLite محلی یا Online تنظیم کنید.

---

### ۲. Production لوکال — API فقط

```bash
npm run build:backend
cd backend && npm ci --omit=dev
DEPLOYMENT_MODE=desktop node dist/server.js
```

---

### ۳. Production لوکال — سرور یکپارچه (API + فرانت)

```bash
npm run build:web:server   # یا build:web:electron برای دسکتاپ
npm run build:backend

export DEPLOYMENT_MODE=server
export SERVE_FRONTEND=true
export HOST=0.0.0.0
export PORT=4000
node backend/dist/server.js
```

همه چیز روی `http://localhost:4000` در دسترس است.

---

### ۴. Electron — توسعه

```bash
npm install
cd backend && npm install && cd ..
npm run build:electron:assets
npx electron .
```

---

### ۵. Electron — بسته نهایی

```bash
# Linux AppImage
npm run dist:linux

# Windows portable
npm run dist:win

# هر دو
npm run dist:all
```

خروجی در پوشه `release/`:

```
release/
  EasyStock Accountant-0.1.0-linux-x86_64.AppImage
  EasyStock Accountant-0.1.0-win-x64.exe   (portable)
```

> این فایل‌ها در git نیستند. بعد از بیلد از `release/` کپی بگیرید.

---

## بیلد و خروجی‌ها

### جدول دستورات npm

| دستور | توضیح | خروجی |
|-------|--------|-------|
| `npm run dev` | فرانت dev | — |
| `npm run build` | Next.js عمومی | `.next/` |
| `npm run build:web:server` | فرانت مود سرور | `.next/` با `DEPLOYMENT_MODE=server` |
| `npm run build:web:electron` | فرانت Electron | `.next/standalone` + strip |
| `npm run build:backend` | باندل بک‌اند | `backend/dist/server.js` |
| `npm run build:electron:main` | main process Electron | `electron-dist/main.cjs` |
| `npm run build:electron:assets` | همه assetهای Electron | backend + next + electron main |
| `npm run dist:linux` | AppImage | `release/*.AppImage` |
| `npm run dist:win` | Windows portable | `release/*.exe` |
| `npm run deploy:pack` | بسته دیپلوی سرور | `deploy-staging/` |
| `npm run deploy:push` | بیلد + push به ریپوی deploy | — |
| `npm run deploy` | همان deploy:push | — |
| `npm run check:desktop-hygiene` | بررسی نبود کد issuer روی main | — |

### ساختار بسته دیپلوی (`deploy-staging/`)

```
deploy-staging/
├── backend/
│   ├── dist/server.js
│   ├── package.json
│   └── package-lock.json
├── .next/
│   ├── standalone/        # سرور Next
│   └── static/            # فایل‌های استاتیک
├── public/
├── uploads/.gitkeep
├── deploy-info.json       # commit، تاریخ بیلد
├── start-server.sh
├── server-update.sh
├── ecosystem.config.cjs   # pm2
├── env.example
└── .gitignore
```

---

## دیپلوی سرور (الگوی CI/CD)

```
[برنچ server] → GitHub Actions → بیلد → push → [accountant_deploy]
                                                      ↓
                                              git pull روی VPS
```

### دیپلوی دستی (بدون CI)

روی برنچ `server`:

```bash
git checkout server
git pull origin server

# نصب وابستگی‌ها (اولین بار)
npm ci
npm ci --prefix backend

# بیلد + push به ریپوی deploy
npm run deploy:push
```

فقط بسته‌بندی بدون push:

```bash
npm run deploy:pack
# خروجی: deploy-staging/
```

بسته‌بندی بدون بیلد مجدد (اگر قبلاً build گرفته‌اید):

```bash
npm run deploy:push -- --no-build
```

تست بدون push:

```bash
npm run deploy:push -- --dry-run
```

### متغیرهای اختیاری اسکریپت

```bash
export DEPLOY_REPO=git@github.com:alirayaneh/accountant_deploy.git
export DEPLOY_BRANCH=main
export DEPLOY_OUT_DIR=./deploy-staging
export DEPLOY_WORK_DIR=./.deploy-work
npm run deploy:push
```

---

## راه‌اندازی اولیه سرور

### ۱. Clone ریپوی deploy

```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www

git clone git@github.com:alirayaneh/accountant_deploy.git easystock
cd easystock
```

### ۲. تنظیم `.env`

```bash
cp env.example .env
nano .env
```

حداقل این موارد را پر کنید:

- `JWT_SECRET`, `SESSION_SECRET`, `LICENSE_SIGNING_SECRET`
- `DB_*` (MySQL)
- `FRONTEND_URL` (مثلاً `https://yourdomain.com`)
- `SUPERADMIN_EMAILS`

### ۳. MySQL

```sql
CREATE DATABASE easystock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'easystock'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON easystock.* TO 'easystock'@'localhost';
FLUSH PRIVILEGES;
```

### ۴. نصب وابستگی‌ها و اجرا

**روش ساده:**

```bash
chmod +x start-server.sh
./start-server.sh
```

**با pm2 (پیشنهادی):**

```bash
npm ci --omit=dev --prefix backend
npm install -g pm2

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # دستور systemd را اجرا کنید
```

### ۵. Superadmin

بعد از اولین ثبت‌نام با ایمیلی که در `SUPERADMIN_EMAILS` است، نقش superadmin خودکار اعمال می‌شود.

یا از سورس:

```bash
npx tsx backend/scripts/promote-superadmin.ts admin@example.com
```

---

## به‌روزرسانی سرور (Pull)

```bash
cd /var/www/easystock
chmod +x server-update.sh
./server-update.sh
```

یا دستی:

```bash
git pull origin main
npm ci --omit=dev --prefix backend
pm2 restart easystock-server
```

اطلاعات آخرین دیپلوی:

```bash
cat deploy-info.json
```

---

## GitHub Actions

Workflow: `.github/workflows/deploy-server.yml`

**Trigger:**
- هر push روی برنچ `server`
- دستی از تب Actions → Run workflow

### راه‌اندازی SSH Key

**۱. روی لوکال:**

```bash
ssh-keygen -t ed25519 -C "deploy-accountant" -f ~/.ssh/accountant_deploy -N ""
cat ~/.ssh/accountant_deploy.pub
```

**۲. در GitHub → `accountant_deploy` → Settings → Deploy keys → Add deploy key**
- Title: `accountant-source-ci`
- Key: محتوای `.pub`
- ✅ Allow write access

**۳. در GitHub → `accountant` (سورس) → Settings → Secrets → Actions**

| Secret | مقدار |
|--------|-------|
| `DEPLOY_REPO_SSH_KEY` | محتوای کامل `~/.ssh/accountant_deploy` (private key) |

**۴. ریپوی deploy را بسازید (خالی):**

```bash
# روی GitHub یک repo خالی accountant_deploy بسازید
# اولین deploy از CI خودش push می‌کند
```

**۵. تست:**

```bash
git checkout server
git push origin server
# Actions → Deploy Server را بررسی کنید
```

---

## nginx (اختیاری)

اگر `SERVE_FRONTEND=true` و Node روی پورت 4000 است:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

SSL با certbot:

```bash
sudo certbot --nginx -d yourdomain.com
```

`FRONTEND_URL` و `GOOGLE_CALLBACK_URL` را با دامنه HTTPS به‌روز کنید.

---

## عیب‌یابی

### push دیپلوی fail — Permission denied (publickey)

- Deploy key را در `accountant_deploy` با write access اضافه کنید
- Secret `DEPLOY_REPO_SSH_KEY` را در ریپوی سورس بررسی کنید

### Table 'php.user_profiles' doesn't exist / migrate fails on fresh DB

**علت ۱ (باگ — رفع شد):** قبل از `sequelize.sync()` روی جدول خالی کوئری زده می‌شد. نسخه جدید backend را deploy کنید.

**علت ۲ (تنظیمات):** دیتابیس `php` یعنی `DB_NAME=php` — بهتر است دیتابیس جدا بسازید:

```sql
CREATE DATABASE easystock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL ON easystock.* TO 'php'@'localhost';
```

در `.env`:

```env
DB_NAME=easystock
DB_USER=php
DB_PASSWORD=...
```

بعد از deploy جدید:

```bash
pm2 restart easystock-server
pm2 logs easystock-server --lines 30
```

باید ببینید: `Database synced successfully`

### Cannot find module 'next'

علت: پوشه `.next/standalone/node_modules` در ریپوی deploy commit نشده (`.gitignore` قدیمی همه `node_modules` را نادیده می‌گرفت).

**رفع دائمی:** از برنچ `server` دیپلوی مجدد بزنید:

```bash
npm run deploy:push
```

روی سرور:

```bash
./server-update.sh
./start-server.sh
```

**بررسی روی سرور:**

```bash
ls .next/standalone/node_modules/next/package.json
```

اگر فایل وجود نداشت، `git pull` جدید کافی نیست — باید deploy جدید push شود.

### Frontend build not found

```bash
npm run build:web:server
npm run build:backend
```

مطمئن شوید `.next/standalone` وجود دارد.

### Cannot find module (mysql2, sqlite3, …)

بک‌اند bundle نشده — وابستگی native جداست:

```bash
npm ci --omit=dev --prefix backend
```

### پورت در دسترس نیست

```bash
export HOST=0.0.0.0
export PORT=4000
```

فایروال:

```bash
sudo ufw allow 4000/tcp
# یا فقط 80/443 با nginx
```

### Electron — AppImage اجرا نمی‌شود

```bash
chmod +x "release/EasyStock Accountant-"*.AppImage
./release/EasyStock\ Accountant-*.AppImage
```

### بررسی hygiene دسکتاپ (برنچ main)

```bash
git checkout main
npm run check:desktop-hygiene
```

---

## خلاصه دستورات سریع

```bash
# توسعه
npm run dev                          # فرانت
cd backend && npm run dev            # بک

# بیلد سرور
git checkout server
npm run build:web:server && npm run build:backend

# دیپلوی
npm run deploy:push

# بیلد دسکتاپ
git checkout main
npm run dist:linux

# سرور production
cd /var/www/easystock
./server-update.sh
```

---

## فایل‌های مرتبط

| مسیر | توضیح |
|------|--------|
| `scripts/deploy-pack.mjs` | بسته‌بندی artifact |
| `scripts/deploy-push.mjs` | push به accountant_deploy |
| `deploy-templates/` | اسکریپت‌های روی سرور |
| `.github/workflows/deploy-server.yml` | CI/CD |
| `.env.server` | env بیلد سرور |
| `.env.electron` | env بیلد Electron |
| `electron-builder.yml` | تنظیمات AppImage/portable |

---

*آخرین به‌روزرسانی: ژوئن ۲۰۲۶*
