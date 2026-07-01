import { Request, Response, NextFunction, RequestHandler } from 'express';
import { DesktopLicenseRequest } from './desktop-license';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

type RateEntry = {
    count: number;
    windowStart: number;
};

const buckets = new Map<string, RateEntry>();

function getClientKey(req: Request): string {
    const licenseReq = req as DesktopLicenseRequest;
    if (licenseReq.desktopLicense?.licenseId) {
        return `license:${licenseReq.desktopLicense.licenseId}`;
    }
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return `ip:${forwarded.split(',')[0].trim()}`;
    }
    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

export const desktopRateLimit: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const key = getClientKey(req);
    const now = Date.now();
    let entry = buckets.get(key);

    if (!entry || now - entry.windowStart >= WINDOW_MS) {
        entry = { count: 0, windowStart: now };
        buckets.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > MAX_REQUESTS) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    next();
};
