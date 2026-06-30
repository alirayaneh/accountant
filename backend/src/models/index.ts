import { sequelize } from '../config/database';
import { DataTypes, QueryTypes, ModelAttributeColumnOptions } from 'sequelize';
import Product from './Product';
import Sale from './Sale';
import Customer from './Customer';
import Payment from './Payment';
import Attachment from './Attachment';
import Expense from './Expense';
import RecurringExpense from './RecurringExpense';
import Employee from './Employee';
import ExchangeRate from './ExchangeRate';
import CostTitle from './CostTitle';
import UserProfile from './UserProfile';
import AppSettings from './AppSettings';
import LicenseInfo from './LicenseInfo';
import AdminAuditLog from './AdminAuditLog';
import License from './License';
import LicenseActivation from './LicenseActivation';

const models = {
    Product,
    Sale,
    Customer,
    Payment,
    Attachment,
    Expense,
    RecurringExpense,
    Employee,
    ExchangeRate,
    CostTitle,
    UserProfile,
    AppSettings,
    LicenseInfo,
    AdminAuditLog,
    License,
    LicenseActivation,
};

const TENANT_TABLES = [
    'products',
    'sales',
    'customers',
    'payments',
    'attachments',
    'expenses',
    'recurring_expenses',
    'employees',
    'exchange_rates',
    'cost_titles',
] as const;

async function ensureColumn(tableName: string, columnName: string, definition: ModelAttributeColumnOptions) {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const table = await queryInterface.describeTable(tableName);
        if (!table[columnName]) {
            await queryInterface.addColumn(tableName, columnName, definition);
            console.log(`Added ${columnName} to ${tableName}`);
        }
    } catch {
        // Table may not exist yet; sync will create it.
    }
}

async function migrateExchangeRatesLegacyIndex() {
    const queryInterface = sequelize.getQueryInterface();
    try {
        const table = await queryInterface.describeTable('exchange_rates');
        if (!table.userId) {
            return;
        }

        const indexes = await queryInterface.showIndex('exchange_rates') as Array<{
            name: string;
            unique?: boolean;
            fields: Array<{ attribute?: string; name?: string }>;
        }>;

        for (const index of indexes) {
            const fields = index.fields.map((f) => f.attribute || f.name || '');
            const isLegacyCurrencyOnly =
                index.unique &&
                fields.length === 1 &&
                fields[0] === 'currency';

            if (isLegacyCurrencyOnly && index.name) {
                await queryInterface.removeIndex('exchange_rates', index.name);
                console.log('Removed legacy unique index on exchange_rates.currency');
            }
        }

        const hasCompositeIndex = indexes.some((index) => {
            const fields = index.fields.map((f) => f.attribute || f.name || '');
            return (
                index.unique &&
                fields.includes('userId') &&
                fields.includes('currency')
            );
        });

        if (!hasCompositeIndex) {
            await queryInterface.addIndex('exchange_rates', ['userId', 'currency'], {
                unique: true,
                name: 'exchange_rates_user_id_currency',
            });
            console.log('Added composite unique index on exchange_rates (userId, currency)');
        }
    } catch (error) {
        console.warn('Exchange rates index migration warning:', error);
    }
}

async function migrateTenantColumns() {
    const queryInterface = sequelize.getQueryInterface();

    for (const tableName of TENANT_TABLES) {
        await ensureColumn(tableName, 'userId', {
            type: DataTypes.STRING,
            allowNull: true,
        });
    }

    await ensureColumn('recurring_expenses', 'isActive', {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
    });
    await ensureColumn('recurring_expenses', 'endDate', {
        type: DataTypes.STRING,
        allowNull: true,
    });
    await ensureColumn('employees', 'isActive', {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
    });
    await ensureColumn('employees', 'userProfileId', {
        type: DataTypes.STRING,
        allowNull: true,
    });
    await ensureColumn('user_profiles', 'ownerId', {
        type: DataTypes.STRING,
        allowNull: true,
    });
    await ensureColumn('user_profiles', 'employeeId', {
        type: DataTypes.STRING,
        allowNull: true,
    });

    const firstUser = await UserProfile.findOne({ order: [['createdAt', 'ASC']] });
    if (firstUser) {
        for (const tableName of TENANT_TABLES) {
            await sequelize.query(
                `UPDATE ${tableName} SET userId = :userId WHERE userId IS NULL`,
                { replacements: { userId: firstUser.id }, type: QueryTypes.UPDATE }
            );
        }
    }

    try {
        const productTable = await queryInterface.describeTable('products');
        if (!productTable.media) {
            await queryInterface.addColumn('products', 'media', {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: []
            });
        }

        const attachmentTable = await queryInterface.describeTable('attachments');
        if (!attachmentTable.media) {
            await queryInterface.addColumn('attachments', 'media', {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: []
            });
        }

        const expenseTable = await queryInterface.describeTable('expenses');
        if (!expenseTable.recurringExpenseId) {
            await queryInterface.addColumn('expenses', 'recurringExpenseId', {
                type: DataTypes.STRING,
                allowNull: true
            });
        }
        if (!expenseTable.recurringOccurrenceDate) {
            await queryInterface.addColumn('expenses', 'recurringOccurrenceDate', {
                type: DataTypes.STRING,
                allowNull: true
            });
        }

        const recurringTable = await queryInterface.describeTable('recurring_expenses');
        if (recurringTable.isActive) {
            await sequelize.query(
                `UPDATE recurring_expenses SET isActive = 1 WHERE isActive IS NULL`,
                { type: QueryTypes.UPDATE }
            );
        }
        const employeeTable = await queryInterface.describeTable('employees');
        if (employeeTable.isActive) {
            await sequelize.query(
                `UPDATE employees SET isActive = 1 WHERE isActive IS NULL`,
                { type: QueryTypes.UPDATE }
            );
        }
    } catch (error) {
        console.warn('Column migration warning:', error);
    }

    await migrateExchangeRatesLegacyIndex();
}

export const syncDatabase = async (force: boolean = false) => {
    try {
        // Add userId and other columns before sync tries to create indexes on them.
        if (!force) {
            await migrateTenantColumns();
        }
        await sequelize.sync({ force });
        if (!force) {
            await migrateTenantColumns();
        }
        console.log('Database synced successfully');
    } catch (error) {
        console.error('Error syncing database:', error);
        throw error;
    }
};

export {
    sequelize,
    Product,
    Sale,
    Customer,
    Payment,
    Attachment,
    Expense,
    RecurringExpense,
    Employee,
    ExchangeRate,
    CostTitle,
    UserProfile,
    AppSettings,
    LicenseInfo,
    AdminAuditLog,
    License,
    LicenseActivation
};

export default models;
