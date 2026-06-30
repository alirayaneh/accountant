# EasyStock Backend

Backend API for the EasyStock accounting application.

## Features

- RESTful API with Express.js
- Sequelize ORM with support for MySQL and SQLite
- JWT authentication
- Google OAuth integration
- File upload support
- Comprehensive business logic for inventory, sales, expenses, and more

## Installation

```bash
cd backend
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Edit `.env` and set:
- Database type (mysql or sqlite)
- Database credentials (if using MySQL)
- JWT secret
- Google OAuth credentials (optional)
- Port (default: 4000)

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create sale

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### And more... (see full API documentation)

## Database

The application supports both MySQL and SQLite databases. Switch between them by changing the `DB_TYPE` environment variable.

## File Uploads

Files are stored locally in the `uploads/` directory. The path is configurable via the `UPLOAD_DIR` environment variable.
