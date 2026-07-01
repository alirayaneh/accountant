import crypto from 'crypto';
import os from 'os';
import { Router, Request, Response } from 'express';
import LicenseInfo, { LicenseStatus } from '../models/LicenseInfo';

const router = Router();

const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

function isLicenseEnabled(): boolean {
    return process.env.LICENSE_ENABLED === 'true';
}

function getLicenseServerUrl(): string {
    return (process.env.LICENSE_SERVER_URL || 'https://license.yourdomain.com/api/v1').replace(/\/$/, '');
}

function getProductId(): string {
    return process.env.LICENSE_PRODUCT_ID || 'easystock-accountant';
}

function getMachineId(): string {
    return process.env.MACHINE_ID || 'unknown-machine';
}

function getAppVersion(): string {
    return process.env.APP_VERSION || '0.1.0';
}

function hashLicenseKey(key: string): string {
    return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

async function getOrCreateLicenseRow(): Promise<LicenseInfo> {
    let row = await LicenseInfo.findOne({ order: [['id', 'ASC']] });
    if (!row) {
        row = await LicenseInfo.create({ status: 'inactive' });
    }
    return row;
}

interface LicenseServerActivateResponse {
    valid: boolean;
    license_id?: string;
    expires_at?: string;
    validation_token?: string;
    next_check_at?: string;
    error_code?: string;
    message?: string;
}

interface LicenseServerValidateResponse {
    valid: boolean;
    license_id?: string;
    expires_at?: string;
    validation_token?: string;
    next_check_at?: string;
    error_code?: string;
    message?: string;
}

async function callLicenseServer<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${getLicenseServerUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Product-Id': getProductId(),
            'X-App-Version': getAppVersion(),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
        throw new Error(`License server responded with ${response.status}`);
    }

    return response.json() as Promise<T>;
}

function computeGraceDaysLeft(lastSuccessfulCheckAt: Date | null | undefined): number | null {
    if (!lastSuccessfulCheckAt) return null;
    const graceEndsAt = lastSuccessfulCheckAt.getTime() + GRACE_PERIOD_MS;
    const remaining = graceEndsAt - Date.now();
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

function isLicenseExpired(expiresAt: Date | null | undefined): boolean {
    if (!expiresAt) return false;
    return expiresAt.getTime() < Date.now();
}

async function buildStatusResponse(row: LicenseInfo) {
    const now = Date.now();
    const graceDaysLeft = computeGraceDaysLeft(row.lastSuccessfulCheckAt);

    if (!row.licenseId || row.status === 'inactive') {
        return {
            valid: false,
            status: 'inactive' as LicenseStatus,
            reason: 'NO_LICENSE',
            message: 'لطفاً لایسنس را در تنظیمات فعال کنید',
            expires_at: null,
            last_check_at: row.lastSuccessfulCheckAt?.toISOString() ?? null,
            next_check_at: row.nextCheckAt?.toISOString() ?? null,
            grace_days_left: null,
        };
    }

    if (isLicenseExpired(row.expiresAt)) {
        return {
            valid: false,
            status: 'expired' as LicenseStatus,
            reason: 'LICENSE_EXPIRED',
            message: 'لایسنس منقضی شده است',
            expires_at: row.expiresAt?.toISOString() ?? null,
            last_check_at: row.lastSuccessfulCheckAt?.toISOString() ?? null,
            next_check_at: row.nextCheckAt?.toISOString() ?? null,
            grace_days_left: null,
        };
    }

    if (row.status === 'grace') {
        if (graceDaysLeft === 0) {
            return {
                valid: false,
                status: 'expired' as LicenseStatus,
                reason: 'GRACE_EXPIRED',
                message: 'دوره مهلت آفلاین به پایان رسیده است',
                expires_at: row.expiresAt?.toISOString() ?? null,
                last_check_at: row.lastSuccessfulCheckAt?.toISOString() ?? null,
                next_check_at: row.nextCheckAt?.toISOString() ?? null,
                grace_days_left: 0,
            };
        }

        return {
            valid: true,
            status: 'grace' as LicenseStatus,
            message: 'Could not reach license server; offline grace active',
            expires_at: row.expiresAt?.toISOString() ?? null,
            last_check_at: row.lastSuccessfulCheckAt?.toISOString() ?? null,
            next_check_at: row.nextCheckAt?.toISOString() ?? null,
            grace_days_left: graceDaysLeft,
        };
    }

    if (row.nextCheckAt && row.nextCheckAt.getTime() > now) {
        return {
            valid: true,
            status: row.status,
            expires_at: row.expiresAt?.toISOString() ?? null,
            last_check_at: row.lastSuccessfulCheckAt?.toISOString() ?? null,
            next_check_at: row.nextCheckAt?.toISOString() ?? null,
            grace_days_left: null,
        };
    }

    return {
        valid: true,
        status: row.status,
        expires_at: row.expiresAt?.toISOString() ?? null,
        last_check_at: row.lastSuccessfulCheckAt?.toISOString() ?? null,
        next_check_at: row.nextCheckAt?.toISOString() ?? null,
        grace_days_left: null,
    };
}

async function refreshLicenseIfDue(row: LicenseInfo): Promise<LicenseInfo> {
    const now = new Date();

    if (!row.licenseId || !row.validationToken) {
        return row;
    }

    if (row.nextCheckAt && row.nextCheckAt.getTime() > now.getTime()) {
        return row;
    }

    try {
        const result = await callLicenseServer<LicenseServerValidateResponse>('/licenses/validate', {
            license_id: row.licenseId,
            validation_token: row.validationToken,
            machine_id: getMachineId(),
            product_id: getProductId(),
            app_version: getAppVersion(),
        });

        if (result.valid) {
            const nextCheckAt = result.next_check_at
                ? new Date(result.next_check_at)
                : new Date(now.getTime() + CHECK_INTERVAL_MS);

            await row.update({
                validationToken: result.validation_token ?? row.validationToken,
                expiresAt: result.expires_at ? new Date(result.expires_at) : row.expiresAt,
                lastSuccessfulCheckAt: now,
                nextCheckAt,
                status: 'active',
            });
        } else {
            const graceDaysLeft = computeGraceDaysLeft(row.lastSuccessfulCheckAt);
            if (graceDaysLeft === 0) {
                await row.update({ status: 'expired' });
            } else {
                await row.update({ status: 'grace' });
            }
        }
    } catch {
        const graceDaysLeft = computeGraceDaysLeft(row.lastSuccessfulCheckAt);
        if (graceDaysLeft === 0) {
            await row.update({ status: 'expired' });
        } else {
            await row.update({ status: 'grace' });
        }
    }

    return row.reload();
}

router.use((_req: Request, res: Response, next) => {
    if (!isLicenseEnabled()) {
        return res.status(404).json({ error: 'License endpoints are not available' });
    }
    next();
});

router.get('/status', async (_req: Request, res: Response) => {
    try {
        let row = await getOrCreateLicenseRow();
        const quickStatus = await buildStatusResponse(row);
        res.json(quickStatus);

        if (row.nextCheckAt && row.nextCheckAt.getTime() <= Date.now()) {
            void refreshLicenseIfDue(row).catch((error) => {
                console.error('Background license refresh error:', error);
            });
        }
    } catch (error) {
        console.error('License status error:', error);
        res.status(500).json({ error: 'Failed to get license status' });
    }
});

router.post('/activate', async (req: Request, res: Response) => {
    try {
        const { license_key: licenseKey } = req.body as { license_key?: string };

        if (!licenseKey || typeof licenseKey !== 'string') {
            return res.status(400).json({ error: 'license_key is required' });
        }

        const result = await callLicenseServer<LicenseServerActivateResponse>('/licenses/activate', {
            license_key: licenseKey.trim(),
            product_id: getProductId(),
            machine_id: getMachineId(),
            platform: process.platform,
            app_version: getAppVersion(),
            hostname: os.hostname(),
        });

        const row = await getOrCreateLicenseRow();

        if (!result.valid) {
            return res.status(400).json({
                valid: false,
                error_code: result.error_code || 'INVALID_KEY',
                message: result.message || 'License activation failed',
            });
        }

        const now = new Date();
        const nextCheckAt = result.next_check_at
            ? new Date(result.next_check_at)
            : new Date(now.getTime() + CHECK_INTERVAL_MS);

        await row.update({
            licenseKeyHash: hashLicenseKey(licenseKey),
            licenseId: result.license_id ?? null,
            validationToken: result.validation_token ?? null,
            expiresAt: result.expires_at ? new Date(result.expires_at) : null,
            lastSuccessfulCheckAt: now,
            nextCheckAt,
            machineId: getMachineId(),
            status: 'active',
        });

        res.json(await buildStatusResponse(row));
    } catch (error) {
        console.error('License activation error:', error);
        res.status(502).json({
            valid: false,
            error_code: 'SERVER_UNREACHABLE',
            message: 'Could not reach license server',
        });
    }
});

router.delete('/', async (_req: Request, res: Response) => {
    try {
        const row = await getOrCreateLicenseRow();

        if (row.licenseId && row.validationToken) {
            try {
                await callLicenseServer('/licenses/deactivate', {
                    license_id: row.licenseId,
                    validation_token: row.validationToken,
                    machine_id: getMachineId(),
                });
            } catch {
                // Best-effort remote deactivation.
            }
        }

        await row.update({
            licenseKeyHash: null,
            licenseId: null,
            validationToken: null,
            expiresAt: null,
            lastSuccessfulCheckAt: null,
            nextCheckAt: null,
            machineId: null,
            status: 'inactive',
        });

        res.json({ deactivated: true });
    } catch (error) {
        console.error('License deactivation error:', error);
        res.status(500).json({ error: 'Failed to deactivate license' });
    }
});

function isLocalRequest(req: Request): boolean {
    const addr = req.socket?.remoteAddress || req.ip || '';
    return (
        addr === '127.0.0.1' ||
        addr === '::1' ||
        addr === '::ffff:127.0.0.1' ||
        addr.endsWith('127.0.0.1')
    );
}

router.get('/desktop-credentials', async (req: Request, res: Response) => {
    try {
        if (!isLocalRequest(req)) {
            return res.status(403).json({ error: 'Local access only' });
        }

        let row = await getOrCreateLicenseRow();
        row = await refreshLicenseIfDue(row);
        const status = await buildStatusResponse(row);

        if (!status.valid || !row.licenseId || !row.validationToken) {
            return res.status(403).json({ error: 'No active license' });
        }

        const payload = {
            license_id: row.licenseId,
            validation_token: row.validationToken,
            machine_id: getMachineId(),
            product_id: getProductId(),
            app_version: getAppVersion(),
        };

        const credentials = Buffer.from(JSON.stringify(payload)).toString('base64');
        res.json({ credentials });
    } catch (error) {
        console.error('Desktop credentials error:', error);
        res.status(500).json({ error: 'Failed to get desktop credentials' });
    }
});

export default router;
