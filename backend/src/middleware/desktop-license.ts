import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validateLicense } from '../services/license-key.service';

export interface DesktopLicensePayload {
    license_id: string;
    validation_token: string;
    machine_id: string;
    product_id: string;
    app_version?: string;
}

export interface DesktopLicenseRequest extends Request {
    desktopLicense?: {
        licenseId: string;
        machineId: string;
        productId: string;
    };
}

function getDesktopLicenseHeader(req: Request): string | undefined {
    const raw = req.headers['x-desktop-license'];
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return undefined;
}

function decodeDesktopLicense(header: string): DesktopLicensePayload | null {
    try {
        const json = Buffer.from(header, 'base64').toString('utf8');
        const payload = JSON.parse(json) as DesktopLicensePayload;
        if (
            !payload.license_id ||
            !payload.validation_token ||
            !payload.machine_id ||
            !payload.product_id
        ) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

export const authenticateDesktopLicense: RequestHandler = async (
    req: DesktopLicenseRequest,
    res: Response,
    next: NextFunction
) => {
    const header = getDesktopLicenseHeader(req);
    if (!header) {
        return res.status(401).json({ error: 'X-Desktop-License header required' });
    }

    const payload = decodeDesktopLicense(header);
    if (!payload) {
        return res.status(400).json({ error: 'Invalid X-Desktop-License payload' });
    }

    try {
        const result = await validateLicense({
            licenseId: payload.license_id,
            validationToken: payload.validation_token,
            machineId: payload.machine_id,
            productId: payload.product_id,
        });

        if (!result.valid) {
            return res.status(401).json({ error: 'Invalid desktop license' });
        }

        req.desktopLicense = {
            licenseId: payload.license_id,
            machineId: payload.machine_id,
            productId: payload.product_id,
        };

        next();
    } catch (error) {
        console.error('Desktop license validation error:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'License validation failed' });
    }
};
