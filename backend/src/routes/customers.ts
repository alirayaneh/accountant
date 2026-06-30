import { Router } from 'express';
import { Customer } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveTenantId, tenantWhere } from '../middleware/tenant';

const router = Router();

const serializeCustomer = (customer: Customer) => {
    const { userId, ...rest } = customer.toJSON();
    return rest;
};

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const customers = await Customer.findAll({ where: tenantWhere(req) });
        res.json(customers.map(serializeCustomer));
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const customer = await Customer.findOne({
            where: tenantWhere(req, { id: req.params.id })
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(serializeCustomer(customer));
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const { id, name, phone, address } = req.body;

        const customer = await Customer.create({
            id: id || Date.now().toString(),
            userId: tenantId,
            name,
            phone,
            address
        });

        res.status(201).json(serializeCustomer(customer));
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { name, phone, address } = req.body;

        await Customer.update(
            { name, phone, address },
            { where: tenantWhere(req, { id: req.params.id }) }
        );

        const updated = await Customer.findOne({
            where: tenantWhere(req, { id: req.params.id })
        });
        res.json(updated ? serializeCustomer(updated) : updated);
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const deleted = await Customer.destroy({
            where: tenantWhere(req, { id: req.params.id })
        });

        if (deleted === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

export default router;
