import { Router } from 'express';
import { Payment, Attachment } from '../models';
import type { ProductMedia } from '../models/Product';
import { sequelize } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveTenantId, tenantWhere } from '../middleware/tenant';
import { parseArrayField } from '../utils/json';

const router = Router();

const getAttachmentMedia = (value: unknown): ProductMedia[] =>
    parseArrayField(value) as ProductMedia[];

const getReceiptImage = (receiptImage: unknown, media: ProductMedia[]) =>
    (typeof receiptImage === 'string' && receiptImage) ||
    media.find((item) => item.type === 'image')?.url;

const serializePayment = (payment: Payment) => {
    const data = payment.toJSON();
    const { userId, ...rest } = data;
    return {
        ...rest,
        amount: Number(rest.amount),
        attachmentIds: parseArrayField(rest.attachmentIds) as string[],
    };
};

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { ids } = req.query;

        if (!ids) {
            const payments = await Payment.findAll({
                where: tenantWhere(req),
                order: [['date', 'DESC']]
            });
            return res.json(payments.map(serializePayment));
        }

        const idArray = typeof ids === 'string' ? ids.split(',') : [];
        const payments = await Payment.findAll({
            where: tenantWhere(req, { id: idArray })
        });

        res.json(payments.map(serializePayment));
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const { amount, method, date, attachments } = req.body;

        const paymentId = Date.now().toString() + Math.random();

        const attachmentIds: string[] = [];
        const payment = await Payment.create({
            id: paymentId,
            userId: tenantId,
            amount,
            method,
            date,
            attachmentIds
        }, { transaction });

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                const attachmentId = Date.now().toString() + Math.random();
                const media = getAttachmentMedia(att.media);
                await Attachment.create({
                    id: attachmentId,
                    userId: tenantId,
                    sourceId: paymentId,
                    sourceType: 'payment',
                    date: att.date || date,
                    description: att.description,
                    receiptNumber: att.receiptNumber,
                    receiptImage: getReceiptImage(att.receiptImage, media),
                    media
                }, { transaction });

                attachmentIds.push(attachmentId);
            }
        }

        if (attachmentIds.length > 0) {
            await Payment.update(
                { attachmentIds },
                { where: { id: paymentId, userId: tenantId }, transaction }
            );
            payment.attachmentIds = attachmentIds;
        }

        await transaction.commit();
        res.status(201).json({ id: payment.id });
    } catch (error) {
        await transaction.rollback();
        console.error('Create payment error:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const { amount, method, date, attachments } = req.body;
        const payment = await Payment.findOne({
            where: { id: req.params.id, userId: tenantId },
            transaction
        });

        if (!payment) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Payment not found' });
        }

        const existingAttachments = await Attachment.findAll({
            where: { sourceId: req.params.id, sourceType: 'payment', userId: tenantId },
            transaction
        });
        const incoming = attachments || [];
        const incomingExistingIds = incoming
            .filter((att: any) => att.id && !String(att.id).startsWith('new-'))
            .map((att: any) => att.id);

        const deletedIds = existingAttachments
            .filter((att) => !incomingExistingIds.includes(att.id))
            .map((att) => att.id);

        if (deletedIds.length > 0) {
            await Attachment.destroy({ where: { id: deletedIds, userId: tenantId }, transaction });
        }

        const finalAttachmentIds: string[] = [];
        for (const att of incoming) {
            const media = getAttachmentMedia(att.media);
            if (att.id && !String(att.id).startsWith('new-')) {
                await Attachment.update({
                    date: att.date || date,
                    description: att.description,
                    receiptNumber: att.receiptNumber,
                    receiptImage: getReceiptImage(att.receiptImage, media),
                    media
                }, {
                    where: { id: att.id, sourceId: req.params.id, sourceType: 'payment', userId: tenantId },
                    transaction
                });
                finalAttachmentIds.push(att.id);
            } else {
                const attachmentId = Date.now().toString() + Math.random();
                await Attachment.create({
                    id: attachmentId,
                    userId: tenantId,
                    sourceId: req.params.id,
                    sourceType: 'payment',
                    date: att.date || date,
                    description: att.description,
                    receiptNumber: att.receiptNumber,
                    receiptImage: getReceiptImage(att.receiptImage, media),
                    media
                }, { transaction });
                finalAttachmentIds.push(attachmentId);
            }
        }

        await payment.update({
            amount,
            method,
            date,
            attachmentIds: finalAttachmentIds
        }, { transaction });

        await transaction.commit();
        const updated = await Payment.findOne({ where: { id: req.params.id, userId: tenantId } });
        res.json(updated ? serializePayment(updated) : updated);
    } catch (error) {
        await transaction.rollback();
        console.error('Update payment error:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);

        await Attachment.destroy({
            where: { sourceId: req.params.id, sourceType: 'payment', userId: tenantId },
            transaction
        });

        const deleted = await Payment.destroy({
            where: { id: req.params.id, userId: tenantId },
            transaction
        });

        if (deleted === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Payment not found' });
        }

        await transaction.commit();
        res.status(204).send();
    } catch (error) {
        await transaction.rollback();
        console.error('Delete payment error:', error);
        res.status(500).json({ error: 'Failed to delete payment' });
    }
});

export default router;
