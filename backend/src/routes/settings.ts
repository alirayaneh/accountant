import { Router } from 'express';
import { ExchangeRate, CostTitle, AppSettings } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveTenantId, requireOwner, tenantWhere } from '../middleware/tenant';
import { recalculateProductPricesForUser } from '../utils/product';

const router = Router();

router.get('/exchange-rates', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const rates = await ExchangeRate.findAll({ where: { userId: tenantId } });

        if (rates.length === 0) {
            const { seedDefaultExchangeRates } = await import('../utils/seed');
            await seedDefaultExchangeRates(tenantId);
            const seeded = await ExchangeRate.findAll({ where: { userId: tenantId } });
            return res.json(seeded.map(r => ({ currency: r.currency, rate: r.rate })));
        }

        res.json(rates.map(r => ({ currency: r.currency, rate: r.rate })));
    } catch (error) {
        console.error('Get exchange rates error:', error);
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
});

router.put('/exchange-rates', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const rates = req.body;

        for (const rate of rates) {
            const existing = await ExchangeRate.findOne({
                where: { userId: tenantId, currency: rate.currency }
            });
            if (existing) {
                await existing.update({ rate: rate.rate });
            } else {
                await ExchangeRate.create({
                    userId: tenantId,
                    currency: rate.currency,
                    rate: rate.rate
                });
            }
        }

        await recalculateProductPricesForUser(tenantId);

        res.json({ message: 'Exchange rates updated' });
    } catch (error) {
        console.error('Save exchange rates error:', error);
        res.status(500).json({ error: 'Failed to save exchange rates' });
    }
});

router.get('/cost-titles', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const titles = await CostTitle.findAll({ where: tenantWhere(req) });
        res.json(titles.map(t => ({ id: t.id, title: t.title })));
    } catch (error) {
        console.error('Get cost titles error:', error);
        res.status(500).json({ error: 'Failed to fetch cost titles' });
    }
});

router.post('/cost-titles', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const title = await CostTitle.create({ ...req.body, userId: tenantId });
        res.status(201).json({ id: title.id, title: title.title });
    } catch (error) {
        console.error('Add cost title error:', error);
        res.status(500).json({ error: 'Failed to add cost title' });
    }
});

router.delete('/cost-titles/:id', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    try {
        const deleted = await CostTitle.destroy({
            where: tenantWhere(req, { id: req.params.id })
        });

        if (deleted === 0) {
            return res.status(404).json({ error: 'Cost title not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Delete cost title error:', error);
        res.status(500).json({ error: 'Failed to delete cost title' });
    }
});

router.get('/app', authenticateToken, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const settingsUserId = resolveTenantId(req);

        let settings = await AppSettings.findOne({
            where: { userId: settingsUserId }
        });

        if (!settings) {
            settings = await AppSettings.create({
                userId: settingsUserId,
                shopName: 'حسابدار آنلاین آموزا'
            });
        }

        res.json({ shopName: settings.shopName });
    } catch (error) {
        console.error('Get app settings error:', error);
        res.status(500).json({ error: 'Failed to fetch app settings' });
    }
});

router.put('/app', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const settingsUserId = resolveTenantId(req);
        const { shopName } = req.body;

        await AppSettings.upsert({
            userId: settingsUserId,
            shopName
        });

        res.json({ message: 'App settings updated' });
    } catch (error) {
        console.error('Save app settings error:', error);
        res.status(500).json({ error: 'Failed to save app settings' });
    }
});

export default router;
