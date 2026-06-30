import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface PaymentAttributes {
    id: string;
    userId: string;
    amount: number;
    method: 'CASH' | 'CARD' | 'ONLINE';
    date: string;
    attachmentIds: string[];
}

class Payment extends Model<PaymentAttributes> implements PaymentAttributes {
    public id!: string;
    public userId!: string;
    public amount!: number;
    public method!: 'CASH' | 'CARD' | 'ONLINE';
    public date!: string;
    public attachmentIds!: string[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Payment.init(
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
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        method: {
            type: DataTypes.ENUM('CASH', 'CARD', 'ONLINE'),
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
        }
    },
    {
        sequelize,
        tableName: 'payments',
        timestamps: true
    }
);

export default Payment;
