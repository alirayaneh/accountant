import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from '../config/passport';
import { UserProfile } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { seedDefaultExchangeRates } from '../utils/seed';
import { ensureSuperadminRole } from '../utils/superadmin';
import { isServerDeployment } from '../utils/deployment';
import { createFreeLicenseForUser } from '../services/license-key.service';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

const buildTokenPayload = (user: UserProfile) => {
    const payload: Record<string, string> = {
        id: user.id,
        email: user.email || '',
        role: user.role,
    };
    if (user.ownerId) payload.ownerId = user.ownerId;
    if (user.employeeId) payload.employeeId = user.employeeId;
    return payload;
};

const serializeUser = (user: UserProfile, auth?: AuthRequest['user']) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: user.role,
    ownerId: user.ownerId,
    employeeId: user.employeeId,
    impersonating: auth?.impersonating ?? false,
    impersonatorId: auth?.impersonatorId,
});

async function issueAuthResponse(user: UserProfile, res: any, statusCode = 200) {
    const promoted = await ensureSuperadminRole(user);
    const token = jwt.sign(buildTokenPayload(promoted), JWT_SECRET, { expiresIn: '7d' });
    const body = { token, user: serializeUser(promoted) };
    if (statusCode === 201) {
        return res.status(201).json(body);
    }
    return res.json(body);
}

router.post('/register', async (req, res) => {
    try {
        const { email, password, displayName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existingUser = await UserProfile.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await UserProfile.create({
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            password: hashedPassword,
            displayName: displayName || email.split('@')[0],
            role: 'user',
            authProvider: 'local'
        });

        await seedDefaultExchangeRates(user.id);

        if (isServerDeployment()) {
            try {
                await createFreeLicenseForUser(user.id);
            } catch (licenseError) {
                console.error('Free license creation failed:', licenseError);
            }
        }

        await issueAuthResponse(user, res, 201);
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await UserProfile.findOne({ where: { email } });

        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        await issueAuthResponse(user, res);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    async (req: any, res) => {
        try {
            let user = req.user as UserProfile;
            if (user.role === 'user' && !user.ownerId) {
                await seedDefaultExchangeRates(user.id);
            }
            user = await ensureSuperadminRole(user);
            const token = jwt.sign(buildTokenPayload(user), JWT_SECRET, { expiresIn: '7d' });
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:9002';
            res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
        } catch (error) {
            console.error('Google callback error:', error);
            res.redirect('/login?error=auth_failed');
        }
    }
);

router.get('/me', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let user = await UserProfile.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user = await ensureSuperadminRole(user);

        res.json(serializeUser(user, req.user));
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/logout', (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

export default router;
