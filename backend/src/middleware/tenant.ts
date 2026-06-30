import { Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from './auth';

declare global {
    namespace Express {
        interface User {
            id: string;
            email?: string;
            role: 'user' | 'employee' | 'superadmin';
            ownerId?: string;
            employeeId?: string;
        }
    }
}

export function resolveTenantId(req: AuthRequest): string {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    if (req.user.role === 'employee' && req.user.ownerId) {
        return req.user.ownerId;
    }
    return req.user.id;
}

export function tenantWhere(req: AuthRequest, extra: Record<string, unknown> = {}) {
    return { ...extra, userId: resolveTenantId(req) };
}

export const requireOwner: RequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role === 'employee') {
        return res.status(403).json({ error: 'Owner access required' });
    }
    next();
};
