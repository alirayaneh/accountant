import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Employee, RecurringExpense, UserProfile } from '../models';
import { sequelize } from '../models';
import { endOfMonth } from 'date-fns';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { resolveTenantId, requireOwner, tenantWhere } from '../middleware/tenant';

const router = Router();

const serializeEmployee = (employee: Employee) => {
    const data = employee.toJSON();
    const { userId, ...rest } = data;
    return rest;
};

router.get('/', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    try {
        const employees = await Employee.findAll({ where: tenantWhere(req) });
        res.json(employees.map(serializeEmployee));
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

router.post('/', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const { name, position, salary, email, password } = req.body;

        const employeeId = Date.now().toString();
        const recurringExpenseId = `salary-${employeeId}`;

        await RecurringExpense.create({
            id: recurringExpenseId,
            userId: tenantId,
            title: `حقوق ${name}`,
            amount: salary,
            frequency: 'monthly',
            startDate: endOfMonth(new Date()).toISOString(),
            isActive: true,
        }, { transaction });

        let userProfileId: string | undefined;

        if (email && password) {
            const existingUser = await UserProfile.findOne({ where: { email }, transaction });
            if (existingUser) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Email already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const profileId = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await UserProfile.create({
                id: profileId,
                email,
                password: hashedPassword,
                displayName: name,
                role: 'employee',
                authProvider: 'local',
                ownerId: tenantId,
                employeeId,
            }, { transaction });

            userProfileId = profileId;
        }

        const employee = await Employee.create({
            id: employeeId,
            userId: tenantId,
            name,
            position,
            salary,
            recurringExpenseId,
            isActive: true,
            userProfileId,
        }, { transaction });

        await transaction.commit();
        res.status(201).json(serializeEmployee(employee));
    } catch (error) {
        await transaction.rollback();
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

router.put('/:id', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const employee = await Employee.findOne({
            where: { id: req.params.id, userId: tenantId },
            transaction,
        });

        if (!employee) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        const { name, position, salary, isActive } = req.body;

        const updates: Partial<typeof employee> = {};
        if (name !== undefined) updates.name = name;
        if (position !== undefined) updates.position = position;
        if (salary !== undefined) updates.salary = salary;
        if (isActive !== undefined) updates.isActive = isActive;

        await employee.update(updates, { transaction });

        const recurring = await RecurringExpense.findOne({
            where: { id: employee.recurringExpenseId, userId: tenantId },
            transaction,
        });

        if (recurring) {
            const recurringUpdates: Record<string, unknown> = {};
            if (name !== undefined) recurringUpdates.title = `حقوق ${name}`;
            if (salary !== undefined) recurringUpdates.amount = salary;
            if (isActive === false) {
                recurringUpdates.isActive = false;
                recurringUpdates.endDate = new Date().toISOString();
            } else if (isActive === true) {
                recurringUpdates.isActive = true;
                recurringUpdates.endDate = undefined;
            }
            await recurring.update(recurringUpdates, { transaction });
        }

        await transaction.commit();
        res.json(serializeEmployee(employee));
    } catch (error) {
        await transaction.rollback();
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

router.patch('/:id/deactivate', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const employee = await Employee.findOne({
            where: { id: req.params.id, userId: tenantId },
            transaction,
        });

        if (!employee) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        await employee.update({ isActive: false }, { transaction });

        const recurring = await RecurringExpense.findOne({
            where: { id: employee.recurringExpenseId, userId: tenantId },
            transaction,
        });

        if (recurring) {
            await recurring.update({
                isActive: false,
                endDate: new Date().toISOString(),
            }, { transaction });
        }

        await transaction.commit();
        res.json(serializeEmployee(employee));
    } catch (error) {
        await transaction.rollback();
        console.error('Deactivate employee error:', error);
        res.status(500).json({ error: 'Failed to deactivate employee' });
    }
});

router.patch('/:id/activate', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const employee = await Employee.findOne({
            where: { id: req.params.id, userId: tenantId },
            transaction,
        });

        if (!employee) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        await employee.update({ isActive: true }, { transaction });

        const recurring = await RecurringExpense.findOne({
            where: { id: employee.recurringExpenseId, userId: tenantId },
            transaction,
        });

        if (recurring) {
            await recurring.update({
                isActive: true,
                endDate: undefined,
            }, { transaction });
        }

        await transaction.commit();
        res.json(serializeEmployee(employee));
    } catch (error) {
        await transaction.rollback();
        console.error('Activate employee error:', error);
        res.status(500).json({ error: 'Failed to activate employee' });
    }
});

router.delete('/:id', authenticateToken, requireOwner, async (req: AuthRequest, res) => {
    const transaction = await sequelize.transaction();

    try {
        const tenantId = resolveTenantId(req);
        const employee = await Employee.findOne({
            where: { id: req.params.id, userId: tenantId },
            transaction,
        });

        if (!employee) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (employee.recurringExpenseId) {
            await RecurringExpense.destroy({
                where: { id: employee.recurringExpenseId, userId: tenantId },
                transaction,
            });
        }

        if (employee.userProfileId) {
            await UserProfile.destroy({
                where: { id: employee.userProfileId },
                transaction,
            });
        }

        await Employee.destroy({
            where: { id: req.params.id, userId: tenantId },
            transaction,
        });

        await transaction.commit();
        res.status(204).send();
    } catch (error) {
        await transaction.rollback();
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

export default router;
