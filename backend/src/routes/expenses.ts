import { Router } from 'express';
import { Expense, Attachment } from '../models';
import { sequelize } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveTenantId, tenantWhere } from '../middleware/tenant';

const router = Router();

const serializeExpense = (expense: Expense) => {
    const { userId, ...rest } = expense.toJSON();
    return rest;
};

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const expenses = await Expense.findAll({
            where: tenantWhere(req),
            order: [['date', 'DESC']]
        });
        res.json(expenses.map(serializeExpense));
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const { title, amount, date, attachments } = req.body;

        const expenseId = Date.now().toString();

        const attachmentIds: string[] = [];
        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                const attachmentId = Date.now().toString() + Math.random();
                await Attachment.create({
                    id: attachmentId,
                    userId: tenantId,
                    sourceId: expenseId,
                    sourceType: 'expense',
                    date: att.date || date,
                    description: att.description,
                    receiptNumber: att.receiptNumber,
                    receiptImage: att.receiptImage
                }, { transaction });

                attachmentIds.push(attachmentId);
            }
        }

        const expense = await Expense.create({
            id: expenseId,
            userId: tenantId,
            title,
            amount,
            date,
            attachmentIds
        }, { transaction });

        await transaction.commit();
        res.status(201).json(serializeExpense(expense));
    } catch (error) {
        await transaction.rollback();
        console.error('Create expense error:', error);
        res.status(500).json({ error: 'Failed to create expense' });
    }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const { title, amount, date, attachmentIds, newAttachments, deletedAttachmentIds } = req.body;

        if (deletedAttachmentIds && deletedAttachmentIds.length > 0) {
            await Attachment.destroy({
                where: { id: deletedAttachmentIds, userId: tenantId },
                transaction
            });
        }

        const newAttachmentIds: string[] = [];
        if (newAttachments && newAttachments.length > 0) {
            for (const att of newAttachments) {
                const attachmentId = Date.now().toString() + Math.random();
                await Attachment.create({
                    id: attachmentId,
                    userId: tenantId,
                    sourceId: req.params.id,
                    sourceType: 'expense',
                    date: att.date || date,
                    description: att.description,
                    receiptNumber: att.receiptNumber,
                    receiptImage: att.receiptImage
                }, { transaction });

                newAttachmentIds.push(attachmentId);
            }
        }

        const finalAttachmentIds = [
            ...(attachmentIds || []).filter((id: string) => !deletedAttachmentIds?.includes(id)),
            ...newAttachmentIds
        ];

        await Expense.update(
            { title, amount, date, attachmentIds: finalAttachmentIds },
            { where: { id: req.params.id, userId: tenantId }, transaction }
        );

        await transaction.commit();

        const updated = await Expense.findOne({
            where: { id: req.params.id, userId: tenantId }
        });
        res.json(updated ? serializeExpense(updated) : updated);
    } catch (error) {
        await transaction.rollback();
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);

        await Attachment.destroy({
            where: { sourceId: req.params.id, sourceType: 'expense', userId: tenantId },
            transaction
        });

        const deleted = await Expense.destroy({
            where: { id: req.params.id, userId: tenantId },
            transaction
        });

        if (deleted === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Expense not found' });
        }

        await transaction.commit();
        res.status(204).send();
    } catch (error) {
        await transaction.rollback();
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

export default router;
