import { Router } from 'express';
import { RecurringExpense, Expense } from '../models';
import { addMonths, addYears, isBefore, startOfDay, isEqual } from 'date-fns';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveTenantId, tenantWhere } from '../middleware/tenant';

const router = Router();

const occurrenceKey = (date: Date) => date.toISOString().slice(0, 10);
const recurringExpenseIdFor = (recurringId: string, date: Date) => `recurring-${recurringId}-${occurrenceKey(date)}`;
const nextDueDateFor = (date: Date, frequency: 'monthly' | 'yearly') => (
    frequency === 'monthly' ? addMonths(date, 1) : addYears(date, 1)
);

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const expenses = await RecurringExpense.findAll({ where: tenantWhere(req) });
        res.json(expenses.map(e => {
            const { userId, ...rest } = e.toJSON();
            return rest;
        }));
    } catch (error) {
        console.error('Get recurring expenses error:', error);
        res.status(500).json({ error: 'Failed to fetch recurring expenses' });
    }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const expense = await RecurringExpense.create({
            ...req.body,
            userId: tenantId,
            isActive: req.body.isActive ?? true,
        });
        const { userId, ...rest } = expense.toJSON();
        res.status(201).json(rest);
    } catch (error) {
        console.error('Create recurring expense error:', error);
        res.status(500).json({ error: 'Failed to create recurring expense' });
    }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const deleted = await RecurringExpense.destroy({
            where: tenantWhere(req, { id: req.params.id })
        });

        if (deleted === 0) {
            return res.status(404).json({ error: 'Recurring expense not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Delete recurring expense error:', error);
        res.status(500).json({ error: 'Failed to delete recurring expense' });
    }
});

router.post('/apply', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const tenantId = resolveTenantId(req);
        const recurringExpenses = await RecurringExpense.findAll({
            where: { userId: tenantId, isActive: true }
        });
        const today = startOfDay(new Date());
        let expensesAddedCount = 0;

        for (const re of recurringExpenses) {
            if (re.endDate && isBefore(startOfDay(new Date(re.endDate)), today)) {
                continue;
            }

            let nextDueDate = re.lastAppliedDate
                ? nextDueDateFor(startOfDay(new Date(re.lastAppliedDate)), re.frequency)
                : startOfDay(new Date(re.startDate));

            while (true) {
                if (isBefore(nextDueDate, today) || isEqual(nextDueDate, today)) {
                    const expenseId = recurringExpenseIdFor(re.id, nextDueDate);
                    const existing = await Expense.findOne({
                        where: { id: expenseId, userId: tenantId }
                    });

                    if (!existing) {
                        await Expense.create({
                            id: expenseId,
                            userId: tenantId,
                            title: re.title,
                            amount: re.amount,
                            date: nextDueDate.toISOString(),
                            attachmentIds: [],
                            recurringExpenseId: re.id,
                            recurringOccurrenceDate: occurrenceKey(nextDueDate)
                        });
                        expensesAddedCount++;
                    }

                    await re.update({
                        lastAppliedDate: nextDueDate.toISOString()
                    });

                    nextDueDate = nextDueDateFor(nextDueDate, re.frequency);
                } else {
                    break;
                }
            }
        }

        res.json({ count: expensesAddedCount });
    } catch (error) {
        console.error('Apply recurring expenses error:', error);
        res.status(500).json({ error: 'Failed to apply recurring expenses' });
    }
});

export default router;
