import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserProfile, AdminAuditLog } from '../models';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const IMPERSONATION_TTL = '2h';
const NORMAL_TTL = '7d';

function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}

function buildTokenPayload(user: UserProfile, impersonatorId?: string) {
    const payload: Record<string, string | boolean> = {
        id: user.id,
        email: user.email || '',
        role: user.role,
    };
    if (user.ownerId) payload.ownerId = user.ownerId;
    if (user.employeeId) payload.employeeId = user.employeeId;
    if (impersonatorId) {
        payload.impersonatorId = impersonatorId;
        payload.impersonating = true;
    }
    return payload;
}

router.post('/impersonate', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const { userId } = req.body as { userId?: string };

        if (!userId || !req.user) {
            return res.status(400).json({ error: 'userId is required' });
        }

        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot impersonate yourself' });
        }

        const target = await UserProfile.findByPk(userId);
        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (target.role === 'superadmin') {
            return res.status(403).json({ error: 'Cannot impersonate another superadmin' });
        }

        await AdminAuditLog.create({
            adminId: req.user.id,
            targetUserId: target.id,
            action: 'impersonate_start',
            ipAddress: getClientIp(req),
        });

        const token = jwt.sign(buildTokenPayload(target, req.user.id), JWT_SECRET, {
            expiresIn: IMPERSONATION_TTL,
        });

        res.json({
            token,
            user: {
                id: target.id,
                email: target.email,
                displayName: target.displayName,
                photoURL: target.photoURL,
                role: target.role,
                ownerId: target.ownerId,
                employeeId: target.employeeId,
                impersonating: true,
                impersonatorId: req.user.id,
            },
        });
    } catch (error) {
        console.error('Impersonate error:', error);
        res.status(500).json({ error: 'Failed to impersonate user' });
    }
});

router.post('/stop-impersonate', authenticateToken, async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        if (!token || !req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            impersonating?: boolean;
            impersonatorId?: string;
        };

        if (!decoded.impersonating || !decoded.impersonatorId) {
            return res.status(400).json({ error: 'Not in impersonation session' });
        }

        const admin = await UserProfile.findByPk(decoded.impersonatorId);
        if (!admin || admin.role !== 'superadmin') {
            return res.status(403).json({ error: 'Original admin session invalid' });
        }

        await AdminAuditLog.create({
            adminId: admin.id,
            targetUserId: req.user.id,
            action: 'impersonate_stop',
            ipAddress: getClientIp(req),
        });

        const newToken = jwt.sign(buildTokenPayload(admin), JWT_SECRET, {
            expiresIn: NORMAL_TTL,
        });

        res.json({
            token: newToken,
            user: {
                id: admin.id,
                email: admin.email,
                displayName: admin.displayName,
                photoURL: admin.photoURL,
                role: admin.role,
                ownerId: admin.ownerId,
                employeeId: admin.employeeId,
                impersonating: false,
            },
        });
    } catch (error) {
        console.error('Stop impersonate error:', error);
        res.status(500).json({ error: 'Failed to stop impersonation' });
    }
});

export default router;
