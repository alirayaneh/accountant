# راه‌اندازی بک‌اند EasyStock

## ✅ بک‌اند شما با موفقیت ایجاد شد!

بک‌اند Node.js/Express شما اکنون آماده استفاده است.

## 🚀 مشخصات بک‌اند

- **Framework**: Express.js + TypeScript
- **ORM**: Sequelize  
- **پایگاه داده**: SQLite (قابل تغییر به MySQL)
- **Authentication**: JWT + Google OAuth
- **Port**: 4000
- **Upload**: Multer (local file storage)

## 📦 وضعیت فعلی

✅ سرور در حال اجرا: `http://localhost:4000`
✅ پایگاه داده SQLite ایجاد شد
✅ تمام جداول sync شدند  
✅ نرخ ارز پیش‌فرض ثبت شد

## 🔧 نحوه استفاده

### 1. ثبت نام کاربر جدید

\`\`\`bash
curl -X POST http://localhost:4000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"your@email.com","password":"yourpass","displayName":"نام شما"}'
\`\`\`

پاسخ شامل `token` و اطلاعات `user` است. token را ذخیره کنید.

### 2. لاگین

\`\`\`bash
curl -X POST http://localhost:4000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"your@email.com","password":"yourpass"}'
\`\`\`

### 3. استفاده از API با Token

\`\`\`bash
# دریافت لیست محصولات
curl -X GET http://localhost:4000/api/products \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# افزودن محصول  
curl -X POST http://localhost:4000/api/products \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "p1",
    "name": "محصول تست",
    "quantity": 100,
    "price": 50000,
    "costs": [],
    "lowStockThreshold": 10,
    "profitMargin": 20
  }'
\`\`\`

## 🔗 اتصال فرانت‌اند

### روش 1: تغییر Storage Type در تنظیمات

1. فرانت‌اند را اجرا کنید: `npm run dev`
2. به Dashboard > تنظیمات > ذخیره‌سازی بروید
3. یکی از گزینه‌های زیر را انتخاب کنید:
   - **SQLite (قابل حمل)**: اتصال به بک‌اند محلی با SQLite
   - **MySQL (محلی)**: اتصال به بک‌اند محلی با MySQL
   - **آنلاین (سرور)**: اتصال به سرور خارجی

### روش 2: استفاده مستقیم از APIDataProvider

\`\`\`typescript
import { APIDataProvider } from '@/lib/db-api';

// در کامپوننت خود
const apiToken = localStorage.getItem('apiToken'); // token از login
const db = APIDataProvider('http://localhost:4000', () => apiToken);

// حالا می‌توانید از db استفاده کنید
const products = await db.getAllProducts();
\`\`\`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - ثبت نام  
- `POST /api/auth/login` - ورود
- `GET /api/auth/me` - دریافت اطلاعات کاربر
- `GET /api/auth/google` - Google OAuth

### Products
- `GET /api/products` - لیست محصولات
- `GET /api/products/:id` - دریافت محصول
- `POST /api/products` - افزودن محصول
- `PUT /api/products/:id` - به‌روزرسانی محصول
- `DELETE /api/products/:id` - حذف محصول

### Sales
- `GET /api/sales` - لیست فروش‌ها
- `POST /api/sales` - ثبت فروش جدید

### Customers
- `GET /api/customers` - لیست مشتریان
- `POST /api/customers` - افزودن مشتری
- `PUT /api/customers/:id` - به‌روزرسانی مشتری
- `DELETE /api/customers/:id` - حذف مشتری

### Expenses
- `GET /api/expenses` - لیست هزینه‌ها
- `POST /api/expenses` - ثبت هزینه
- `PUT /api/expenses/:id` - به‌روزرسانی هزینه
- `DELETE /api/expenses/:id` - حذف هزینه

### Employees
- `GET /api/employees` - لیست کارمندان
- `POST /api/employees` - افزودن کارمند
- `DELETE /api/employees/:id` - حذف کارمند

### Settings
- `GET /api/settings/exchange-rates` - دریافت نرخ ارز
- `PUT /api/settings/exchange-rates` - به‌روزرسانی نرخ ارز
- `GET /api/settings/cost-titles` - عناوین هزینه
- `POST /api/settings/cost-titles` - افزودن عنوان هزینه
- `GET /api/settings/app` - تنظیمات برنامه
- `PUT /api/settings/app` - به‌روزرسانی تنظیمات

### Upload
- `POST /api/upload` - آپلود فایل

## ⚙️ تنظیمات پیشرفته

### تغییر پایگاه داده به MySQL

1. فایل `.env` را ویرایش کنید:

\`\`\`env
DB_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=easystock
MYSQL_USERNAME=root
MYSQL_PASSWORD=yourpassword
\`\`\`

2. سرور را restart کنید

### تنظیم Google OAuth

1. از [Google Cloud Console](https://console.cloud.google.com/) یک OAuth Client ID بگیرید
2. در `.env` تنظیم کنید:

\`\`\`env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
\`\`\`

## 🛠 دستورات مفید

\`\`\`bash
# نصب dependencies
cd backend && npm install

# اجرا در حالت development
npm run dev

# build برای production
npm run build

# اجرا در production
npm start
\`\`\`

## 📊 دیتابیس

- **SQLite**: فایل `database.sqlite` در پوشه `backend/`
- **MySQL**: جداول به صورت خودکار ایجاد می‌شوند

## 🔐 امنیت

⚠️ **مهم**: قبل از استفاده در production:

1. `JWT_SECRET` و `SESSION_SECRET` را تغییر دهید
2. CORS را محدود به دامنه خودتان کنید
3. از HTTPS استفاده کنید
4. Rate limiting اضافه کنید

## ❓ مشکلات رایج

### سرور اجرا نمیشود
- مطمئن شوید port 4000 آزاد است
- dependencies را دوباره نصب کنید: `npm install`

### خطای اتصال به دیتابیس
- اطلاعات `.env` را بررسی کنید
- برای MySQL مطمئن شوید سرور MySQL در حال اجرا است

### مشکل احراز هویت
- Token را در header به درستی ارسال کنید
- از فرمت `Bearer YOUR_TOKEN` استفاده کنید

## 📞 پشتیبانی

برای مشکلات و سوالات، issue باز کنید یا با تیم توسعه تماس بگیرید.

---

**نو شده با ❤️ برای EasyStock**
