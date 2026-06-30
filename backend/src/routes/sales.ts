import { Router } from 'express';
import { Sale, Product, Customer, ExchangeRate } from '../models';
import { sequelize } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveTenantId, tenantWhere } from '../middleware/tenant';
import { calculateTotalCostInToman } from '../utils/product';
import { parseArrayField } from '../utils/json';

const router = Router();

const serializeSale = (sale: Sale) => {
    const data = sale.toJSON();
    const { userId, ...rest } = data;
    return {
        ...rest,
        id: Number(rest.id),
        total: Number(rest.total),
        items: parseArrayField(rest.items),
        paymentIds: parseArrayField(rest.paymentIds) as string[],
    };
};

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const sales = await Sale.findAll({
            where: tenantWhere(req),
            order: [['id', 'DESC']]
        });
        res.json(sales.map(serializeSale));
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const { items, total, paymentIds, date, customerId, customerName, newCustomerName } = req.body;

        let finalCustomerId = customerId;
        let finalCustomerName = customerName;

        if (newCustomerName && !customerId) {
            const customer = await Customer.create({
                id: Date.now().toString(),
                userId: tenantId,
                name: newCustomerName
            }, { transaction });

            finalCustomerId = customer.id;
            finalCustomerName = customer.name;
        }

        const rates = await ExchangeRate.findAll({ where: { userId: tenantId }, transaction });

        const saleItems = await Promise.all(
            items.map(async (item: any) => {
                const product = await Product.findOne({
                    where: { id: item.productId, userId: tenantId },
                    transaction
                });

                if (product) {
                    const totalCostPerUnit = calculateTotalCostInToman(product.costs, rates);

                    await product.update({
                        quantity: product.quantity - item.quantity
                    }, { transaction });

                    return {
                        ...item,
                        totalCost: totalCostPerUnit * item.quantity
                    };
                }

                return {
                    ...item,
                    totalCost: 0
                };
            })
        );

        const sale = await Sale.create({
            id: Date.now(),
            userId: tenantId,
            items: saleItems,
            total,
            paymentIds: paymentIds || [],
            date,
            customerId: finalCustomerId,
            customerName: finalCustomerName
        }, { transaction });

        await transaction.commit();
        res.status(201).json(serializeSale(sale));
    } catch (error) {
        await transaction.rollback();
        console.error('Create sale error:', error);
        res.status(500).json({ error: 'Failed to create sale' });
    }
});

export default router;
