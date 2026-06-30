import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import passport from './config/passport';
import { syncDatabase } from './models';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import saleRoutes from './routes/sales';
import customerRoutes from './routes/customers';
import paymentRoutes from './routes/payments';
import expenseRoutes from './routes/expenses';
import recurringExpenseRoutes from './routes/recurring-expenses';
import employeeRoutes from './routes/employees';
import settingsRoutes from './routes/settings';
import attachmentRoutes from './routes/attachments';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/users';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';
const serveFrontend = process.env.SERVE_FRONTEND === 'true';

function resolveFrontendDir() {
    if (process.env.FRONTEND_DIR) {
        return path.resolve(process.env.FRONTEND_DIR);
    }

    const candidates = [
        path.resolve(process.cwd(), '.next/standalone'),
        path.resolve(process.cwd(), '../.next/standalone'),
        path.resolve(__dirname, '../../.next/standalone'),
    ];

    return candidates.find(candidate => fs.existsSync(path.join(candidate, '.next', 'required-server-files.json'))) || candidates[0];
}

const frontendDir = resolveFrontendDir();

function findExistingDir(candidates: string[]) {
    return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());
}

function resolveFrontendStaticDir() {
    if (process.env.FRONTEND_STATIC_DIR) {
        return path.resolve(process.env.FRONTEND_STATIC_DIR);
    }

    return findExistingDir([
        path.join(frontendDir, '.next', 'static'),
        path.resolve(process.cwd(), '.next/static'),
        path.resolve(process.cwd(), '../.next/static'),
        path.resolve(__dirname, '../../.next/static'),
    ]);
}

function resolveFrontendPublicDir() {
    if (process.env.FRONTEND_PUBLIC_DIR) {
        return path.resolve(process.env.FRONTEND_PUBLIC_DIR);
    }

    return findExistingDir([
        path.join(frontendDir, 'public'),
        path.resolve(process.cwd(), 'public'),
        path.resolve(process.cwd(), '../public'),
        path.resolve(__dirname, '../../public'),
    ]);
}

type NextRequestHandler = (req: express.Request, res: express.Response) => Promise<void>;

async function prepareFrontend(): Promise<NextRequestHandler | null> {
    if (!serveFrontend) {
        return null;
    }

    const requiredServerFiles = path.join(frontendDir, '.next', 'required-server-files.json');
    if (!fs.existsSync(requiredServerFiles)) {
        throw new Error(`Frontend build not found at ${frontendDir}. Run next build first.`);
    }

    const requireFromFrontend = createRequire(path.join(frontendDir, 'server.js'));
    const next = requireFromFrontend('next');
    const { config } = require(requiredServerFiles);

    process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config);

    const nextApp = next({
        dev: false,
        dir: frontendDir,
        hostname: HOST,
        port: Number(PORT),
        conf: config,
    });

    await nextApp.prepare();
    return nextApp.getRequestHandler();
}

function mountFrontendAssets() {
    if (!serveFrontend) {
        return;
    }

    const staticDir = resolveFrontendStaticDir();
    if (staticDir) {
        app.use('/_next/static', express.static(staticDir, {
            immutable: true,
            maxAge: '1y',
        }));
        console.log(`✓ Frontend static assets: ${staticDir}`);
    } else {
        console.warn('⚠ Frontend static assets not found. Run next build and keep .next/static available.');
    }

    const publicDir = resolveFrontendPublicDir();
    if (publicDir) {
        app.use(express.static(publicDir, {
            maxAge: '1h',
        }));
        console.log(`✓ Frontend public assets: ${publicDir}`);
    }
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:9002',
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));
mountFrontendAssets();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/recurring-expenses', recurringExpenseRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint, only used when the frontend is not served by this process.
app.get('/api', (req, res) => {
    res.json({
        message: 'EasyStock Backend API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            sales: '/api/sales',
            customers: '/api/customers',
            payments: '/api/payments',
            expenses: '/api/expenses',
            recurringExpenses: '/api/recurring-expenses',
            employees: '/api/employees',
            settings: '/api/settings',
            attachments: '/api/attachments',
            upload: '/api/upload',
            users: '/api/users'
        }
    });
});

// Start server
const startServer = async () => {
    try {
        const nextHandler = await prepareFrontend();

        if (nextHandler) {
            app.all('*', async (req, res) => {
                await nextHandler(req, res);
            });
        } else {
            app.get('/', (req, res) => {
                res.redirect('/api');
            });

            // 404 handler for API-only mode.
            app.use((req, res) => {
                res.status(404).json({ error: 'Endpoint not found' });
            });
        }

        // Error handling middleware
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error('Error:', err);

            if (err.name === 'MulterError') {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large' });
                }
                return res.status(400).json({ error: err.message });
            }

            res.status(err.status || 500).json({
                error: err.message || 'Internal server error'
            });
        });

        // Sync database
        await syncDatabase();
        console.log('✓ Database synced successfully');

        // Start listening
        app.listen(PORT, () => {
            console.log(`✓ Server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`✓ Database type: ${process.env.DB_TYPE || 'sqlite'}`);
            console.log(`✓ API available at: http://localhost:${PORT}`);
            console.log(`✓ Health check: http://localhost:${PORT}/health`);
            if (nextHandler) {
                console.log(`✓ Frontend available at: http://${HOST}:${PORT}`);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

export default app;
