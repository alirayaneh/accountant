import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { UserProfile } from '../models';

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

export interface AuthRequest extends Request {
    user?: Express.User;
}

export const authenticateToken: RequestHandler = async (
    req,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

        jwt.verify(token, secret, async (err: any, decoded: any) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }

            // Verify user exists in database
            const user = await UserProfile.findByPk(decoded.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            req.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                ownerId: user.ownerId,
                employeeId: user.employeeId,
            };

            next();
        });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const requireAdmin: RequestHandler = (
    req,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

// Optional auth - doesn't fail if no token provided
export const optionalAuth: RequestHandler = async (
    req,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

        jwt.verify(token, secret, async (err: any, decoded: any) => {
            if (!err && decoded) {
                const user = await UserProfile.findByPk(decoded.id);
                if (user) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                        ownerId: user.ownerId,
                        employeeId: user.employeeId,
                    };
                }
            }
            next();
        });
    } catch (error) {
        next();
    }
};
