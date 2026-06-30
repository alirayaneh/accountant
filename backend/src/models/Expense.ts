import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface ExpenseAttributes {
    id: string;
    userId: string;
    title: string;
    amount: number;
    date: string;
    attachmentIds: string[];
    recurringExpenseId?: string;
    recurringOccurrenceDate?: string;
}

class Expense extends Model<ExpenseAttributes> implements ExpenseAttributes {
    public id!: string;
    public userId!: string;
    public title!: string;
    public amount!: number;
    public date!: string;
    public attachmentIds!: string[];
    public recurringExpenseId?: string;
    public recurringOccurrenceDate?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Expense.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        date: {
            type: DataTypes.STRING,
            allowNull: false
        },
        attachmentIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        },
        recurringExpenseId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        recurringOccurrenceDate: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'expenses',
        timestamps: true
    }
);

export default Expense;
