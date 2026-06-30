import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import License from '../models/License';
import LicenseActivation from '../models/LicenseActivation';

const CHECK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const FREE_LICENSE_YEARS = 10;

function getSigningSecret(): string {
    return process.env.LICENSE_SIGNING_SECRET || process.env.JWT_SECRET || 'license-signing-secret';
}

function getProductId(): string {
    return process.env.LICENSE_PRODUCT_ID || 'easystock-accountant';
}

function randomSegment(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
}

export function generateLicenseKey(): string {
    return `ESAC-${randomSegment(4)}-${randomSegment(4)}-${randomSegment(4)}`;
}

export function hashLicenseKey(key: string): string {
    return crypto.createHash('sha256').update(key.trim().toUpperCase()).digest('hex');
}

export function maskLicenseKey(key: string): string {
    const parts = key.split('-');
    if (parts.length < 2) return 'ESAC-****';
    return `${parts[0]}-${parts[1]}-****-****`;
}

function buildKeyHint(key: string): string {
    const parts = key.split('-');
    if (parts.length < 4) return '****';
    return `${parts[0]}-${parts[1]}-****-${parts[3]}`;
}

export function signValidationToken(payload: {
    licenseId: string;
    machineId: string;
    productId: string;
    expiresAt?: Date | null;
}): string {
    const expiresAt = payload.expiresAt ?? new Date(Date.now() + FREE_LICENSE_YEARS * 365 * 24 * 60 * 60 * 1000);
    return jwt.sign(
        {
            license_id: payload.licenseId,
            machine_id: payload.machineId,
            product_id: payload.productId,
            exp: Math.floor(expiresAt.getTime() / 1000),
        },
        getSigningSecret()
    );
}

export function verifyValidationToken(token: string): {
    licenseId: string;
    machineId: string;
    productId: string;
} | null {
    try {
        const decoded = jwt.verify(token, getSigningSecret()) as {
            license_id: string;
            machine_id: string;
            product_id: string;
        };
        return {
            licenseId: decoded.license_id,
            machineId: decoded.machine_id,
            productId: decoded.product_id,
        };
    } catch {
        return null;
    }
}

export async function findLicenseByKey(licenseKey: string): Promise<License | null> {
    const hash = hashLicenseKey(licenseKey);
    return License.findOne({ where: { licenseKeyHash: hash } });
}

export async function createFreeLicenseForUser(userId: string): Promise<{ license: License; plainKey: string }> {
    const existing = await License.findOne({ where: { userId } });
    if (existing) {
        throw new Error('License already exists for user');
    }

    const plainKey = generateLicenseKey();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + FREE_LICENSE_YEARS);

    const license = await License.create({
        id: `lic_${crypto.randomBytes(8).toString('hex')}`,
        userId,
        licenseKeyHash: hashLicenseKey(plainKey),
        productId: getProductId(),
        plan: 'free',
        status: 'active',
        expiresAt,
        maxMachines: 1,
        keyHint: buildKeyHint(plainKey),
    });

    return { license, plainKey };
}

export async function regenerateLicenseKeyForUser(userId: string): Promise<{ license: License; plainKey: string }> {
    const existing = await License.findOne({ where: { userId } });
    const plainKey = generateLicenseKey();

    if (!existing) {
        return createFreeLicenseForUser(userId);
    }

    await LicenseActivation.destroy({ where: { licenseId: existing.id } });

    await existing.update({
        licenseKeyHash: hashLicenseKey(plainKey),
        status: 'active',
        keyHint: buildKeyHint(plainKey),
    });

    return { license: existing, plainKey };
}

export function getNextCheckAt(from: Date = new Date()): Date {
    return new Date(from.getTime() + CHECK_INTERVAL_MS);
}

export async function activateLicense(params: {
    licenseKey: string;
    machineId: string;
    productId: string;
    appVersion?: string;
}): Promise<{
    valid: boolean;
    license_id?: string;
    expires_at?: string;
    validation_token?: string;
    next_check_at?: string;
    error_code?: string;
    message?: string;
}> {
    const license = await findLicenseByKey(params.licenseKey);

    if (!license || license.status !== 'active') {
        return { valid: false, error_code: 'INVALID_KEY', message: 'License key not found or revoked' };
    }

    if (license.productId !== params.productId) {
        return { valid: false, error_code: 'PRODUCT_MISMATCH', message: 'License not for this product' };
    }

    if (license.expiresAt && license.expiresAt.getTime() < Date.now()) {
        await license.update({ status: 'expired' });
        return { valid: false, error_code: 'EXPIRED', message: 'License expired' };
    }

    const activations = await LicenseActivation.findAll({ where: { licenseId: license.id } });
    const existingActivation = activations.find((a) => a.machineId === params.machineId);

    if (!existingActivation && activations.length >= license.maxMachines) {
        return { valid: false, error_code: 'MACHINE_LIMIT', message: 'Maximum activations reached' };
    }

    const now = new Date();
    const nextCheckAt = getNextCheckAt(now);
    const validationToken = signValidationToken({
        licenseId: license.id,
        machineId: params.machineId,
        productId: license.productId,
        expiresAt: license.expiresAt,
    });

    if (existingActivation) {
        await existingActivation.update({
            validationToken,
            lastValidatedAt: now,
            nextCheckAt,
        });
    } else {
        await LicenseActivation.create({
            licenseId: license.id,
            machineId: params.machineId,
            validationToken,
            lastValidatedAt: now,
            nextCheckAt,
        });
    }

    return {
        valid: true,
        license_id: license.id,
        expires_at: license.expiresAt?.toISOString(),
        validation_token: validationToken,
        next_check_at: nextCheckAt.toISOString(),
    };
}

export async function validateLicense(params: {
    licenseId: string;
    validationToken: string;
    machineId: string;
    productId: string;
}): Promise<{
    valid: boolean;
    license_id?: string;
    expires_at?: string;
    validation_token?: string;
    next_check_at?: string;
    error_code?: string;
    message?: string;
}> {
    const tokenPayload = verifyValidationToken(params.validationToken);
    if (
        !tokenPayload ||
        tokenPayload.licenseId !== params.licenseId ||
        tokenPayload.machineId !== params.machineId ||
        tokenPayload.productId !== params.productId
    ) {
        return { valid: false, error_code: 'TOKEN_EXPIRED', message: 'Validation token expired; re-activation required' };
    }

    const license = await License.findByPk(params.licenseId);
    if (!license || license.status !== 'active') {
        return { valid: false, error_code: 'INVALID_KEY', message: 'License not found or revoked' };
    }

    const activation = await LicenseActivation.findOne({
        where: { licenseId: params.licenseId, machineId: params.machineId },
    });

    if (!activation) {
        return { valid: false, error_code: 'TOKEN_EXPIRED', message: 'Activation not found' };
    }

    const now = new Date();
    const nextCheckAt = getNextCheckAt(now);
    const validationToken = signValidationToken({
        licenseId: license.id,
        machineId: params.machineId,
        productId: license.productId,
        expiresAt: license.expiresAt,
    });

    await activation.update({
        validationToken,
        lastValidatedAt: now,
        nextCheckAt,
    });

    return {
        valid: true,
        license_id: license.id,
        expires_at: license.expiresAt?.toISOString(),
        validation_token: validationToken,
        next_check_at: nextCheckAt.toISOString(),
    };
}

export async function deactivateLicense(params: {
    licenseId: string;
    validationToken: string;
    machineId: string;
}): Promise<{ deactivated: boolean }> {
    const tokenPayload = verifyValidationToken(params.validationToken);
    if (!tokenPayload || tokenPayload.licenseId !== params.licenseId) {
        return { deactivated: false };
    }

    await LicenseActivation.destroy({
        where: { licenseId: params.licenseId, machineId: params.machineId },
    });

    return { deactivated: true };
}
