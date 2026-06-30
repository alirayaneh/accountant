import { Router } from 'express';
import { Product } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { tenantWhere } from '../middleware/tenant';
import { parseArrayField } from '../utils/json';

const router = Router();

const normalizeProductPayload = (productData: any) => ({
    ...productData,
    price: Number(productData.price) || 0,
    quantity: Number(productData.quantity) || 0,
    lowStockThreshold: Number(productData.lowStockThreshold) || 0,
    profitMargin: Number(productData.profitMargin) || 0,
    costs: parseArrayField(productData.costs),
    media: parseArrayField(productData.media),
});

const serializeProduct = (product: Product | null) => {
    if (!product) {
        return null;
    }
    const data = normalizeProductPayload(product.toJSON());
    const { userId, ...rest } = data;
    return rest;
};

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const products = await Product.findAll({ where: tenantWhere(req) });
        res.json(products.map(serializeProduct));
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const product = await Product.findOne({
            where: tenantWhere(req, { id: req.params.id })
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(serializeProduct(product));
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = tenantWhere(req).userId as string;
        const productData = normalizeProductPayload(req.body);

        const existing = await Product.findOne({
            where: { id: productData.id, userId: tenantId }
        });
        if (existing) {
            return res.status(400).json({ error: 'Product with this ID already exists' });
        }

        const product = await Product.create({ ...productData, userId: tenantId });
        res.status(201).json(serializeProduct(product));
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = tenantWhere(req).userId as string;
        const originalId = req.params.id;
        const productData = normalizeProductPayload(req.body);

        if (originalId !== productData.id) {
            await Product.destroy({ where: { id: originalId, userId: tenantId } });
            const product = await Product.create({ ...productData, userId: tenantId });
            return res.json(serializeProduct(product));
        }

        await Product.update(productData, { where: { id: originalId, userId: tenantId } });
        const updated = await Product.findOne({ where: { id: originalId, userId: tenantId } });
        res.json(serializeProduct(updated));
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const deleted = await Product.destroy({
            where: tenantWhere(req, { id: req.params.id })
        });

        if (deleted === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;
