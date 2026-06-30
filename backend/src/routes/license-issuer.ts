import { Router, Request, Response } from 'express';
import {
    activateLicense,
    validateLicense,
    deactivateLicense,
} from '../services/license-key.service';

const router = Router();

router.post('/activate', async (req: Request, res: Response) => {
    try {
        const {
            license_key: licenseKey,
            product_id: productId,
            machine_id: machineId,
            app_version: appVersion,
        } = req.body as Record<string, string>;

        if (!licenseKey || !productId || !machineId) {
            return res.status(400).json({
                valid: false,
                error_code: 'INVALID_REQUEST',
                message: 'license_key, product_id, and machine_id are required',
            });
        }

        const result = await activateLicense({
            licenseKey,
            productId,
            machineId,
            appVersion,
        });

        res.json(result);
    } catch (error) {
        console.error('License activate error:', error);
        res.status(500).json({
            valid: false,
            error_code: 'SERVER_ERROR',
            message: 'Internal server error',
        });
    }
});

router.post('/validate', async (req: Request, res: Response) => {
    try {
        const {
            license_id: licenseId,
            validation_token: validationToken,
            machine_id: machineId,
            product_id: productId,
        } = req.body as Record<string, string>;

        if (!licenseId || !validationToken || !machineId || !productId) {
            return res.status(400).json({
                valid: false,
                error_code: 'INVALID_REQUEST',
                message: 'license_id, validation_token, machine_id, and product_id are required',
            });
        }

        const result = await validateLicense({
            licenseId,
            validationToken,
            machineId,
            productId,
        });

        res.json(result);
    } catch (error) {
        console.error('License validate error:', error);
        res.status(500).json({
            valid: false,
            error_code: 'SERVER_ERROR',
            message: 'Internal server error',
        });
    }
});

router.post('/deactivate', async (req: Request, res: Response) => {
    try {
        const {
            license_id: licenseId,
            validation_token: validationToken,
            machine_id: machineId,
        } = req.body as Record<string, string>;

        if (!licenseId || !validationToken || !machineId) {
            return res.status(400).json({
                deactivated: false,
                message: 'license_id, validation_token, and machine_id are required',
            });
        }

        const result = await deactivateLicense({ licenseId, validationToken, machineId });
        res.json(result);
    } catch (error) {
        console.error('License deactivate error:', error);
        res.status(500).json({ deactivated: false, message: 'Internal server error' });
    }
});

export default router;
