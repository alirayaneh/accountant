import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    totalCost: number;
}

export interface SaleAttributes {
    id: number;
    userId: string;
    items: SaleItem[];
    total: number;
    paymentIds: string[];
    date: string;
    customerId?: string;
    customerName?: string;
}

class Sale extends Model<SaleAttributes> implements SaleAttributes {
    public id!: number;
    public userId!: string;
    public items!: SaleItem[];
    public total!: number;
    public paymentIds!: string[];
    public date!: string;
    public customerId?: string;
    public customerName?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Sale.init(
    {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        items: {
            type: DataTypes.JSON,
            allowNull: false
        },
        total: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        paymentIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        },
        date: {
            type: DataTypes.STRING,
            allowNull: false
        },
        customerId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        customerName: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'sales',
        timestamps: true
    }
);

export default Sale;
