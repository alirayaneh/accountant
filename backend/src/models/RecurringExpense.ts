import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface RecurringExpenseAttributes {
    id: string;
    userId: string;
    title: string;
    amount: number;
    frequency: 'monthly' | 'yearly';
    startDate: string;
    lastAppliedDate?: string;
    isActive: boolean;
    endDate?: string;
}

class RecurringExpense extends Model<RecurringExpenseAttributes> implements RecurringExpenseAttributes {
    public id!: string;
    public userId!: string;
    public title!: string;
    public amount!: number;
    public frequency!: 'monthly' | 'yearly';
    public startDate!: string;
    public lastAppliedDate?: string;
    public isActive!: boolean;
    public endDate?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

RecurringExpense.init(
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
        frequency: {
            type: DataTypes.ENUM('monthly', 'yearly'),
            allowNull: false
        },
        startDate: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastAppliedDate: {
            type: DataTypes.STRING,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        endDate: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'recurring_expenses',
        timestamps: true
    }
);

export default RecurringExpense;
