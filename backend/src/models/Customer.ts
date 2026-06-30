import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface CustomerAttributes {
    id: string;
    userId: string;
    name: string;
    phone?: string;
    address?: string;
}

class Customer extends Model<CustomerAttributes> implements CustomerAttributes {
    public id!: string;
    public userId!: string;
    public name!: string;
    public phone?: string;
    public address?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Customer.init(
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
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'customers',
        timestamps: true
    }
);

export default Customer;
