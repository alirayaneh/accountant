import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import License from '../models/License';
import {
    createFreeLicenseForUser,
    regenerateLicenseKeyForUser,
    maskLicenseKey,
} from '../services/license-key.service';
import { isServerDeployment } from '../utils/deployment';

const router = Router();

router.use((_req, res, next) => {
    if (!isServerDeployment()) {
        return res.status(404).json({ error: 'License management is not available' });
    }
    next();
});

router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        let license = await License.findOne({ where: { userId: req.user.id } });

        if (!license) {
            const created = await createFreeLicenseForUser(req.user.id);
            return res.json({
                has_license: true,
                license_id: created.license.id,
                plan: created.license.plan,
                status: created.license.status,
                expires_at: created.license.expiresAt?.toISOString() ?? null,
                key_hint: created.license.keyHint,
                license_key: created.plainKey,
                revealed: true,
                message: 'کلید لایسنس شما ایجاد شد. آن را در نسخه دسکتاپ وارد کنید.',
            });
        }

        res.json({
            has_license: true,
            license_id: license.id,
            plan: license.plan,
            status: license.status,
            expires_at: license.expiresAt?.toISOString() ?? null,
            key_hint: license.keyHint,
            license_key: null,
            revealed: false,
            message: 'برای امنیت، کلید کامل فقط یک‌بار نمایش داده می‌شود. در صورت نیاز می‌توانید کلید جدید بسازید.',
        });
    } catch (error) {
        console.error('Get license error:', error);
        res.status(500).json({ error: 'Failed to fetch license' });
    }
});

router.post('/regenerate', authenticateToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { license, plainKey } = await regenerateLicenseKeyForUser(req.user.id);

        res.json({
            license_id: license.id,
            plan: license.plan,
            status: license.status,
            expires_at: license.expiresAt?.toISOString() ?? null,
            key_hint: license.keyHint,
            license_key: plainKey,
            masked_key: maskLicenseKey(plainKey),
            message: 'کلید جدید صادر شد. کلید قبلی دیگر معتبر نیست.',
        });
    } catch (error) {
        console.error('Regenerate license error:', error);
        res.status(500).json({ error: 'Failed to regenerate license' });
    }
});

export default router;
