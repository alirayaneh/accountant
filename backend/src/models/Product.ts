import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface ProductCost {
    id: string;
    title: string;
    amount: number;
    currency: 'TOMAN' | 'USD' | 'AED' | 'CNY';
}

export interface ProductMedia {
    id: string;
    url: string;
    type: 'image' | 'video';
    name?: string;
}

export interface ProductAttributes {
    id: string;
    userId: string;
    name: string;
    price: number;
    quantity: number;
    lowStockThreshold: number;
    costs: ProductCost[];
    profitMargin: number;
    imageUrl?: string;
    media?: ProductMedia[];
}

class Product extends Model<ProductAttributes> implements ProductAttributes {
    public id!: string;
    public userId!: string;
    public name!: string;
    public price!: number;
    public quantity!: number;
    public lowStockThreshold!: number;
    public costs!: ProductCost[];
    public profitMargin!: number;
    public imageUrl?: string;
    public media?: ProductMedia[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Product.init(
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
        price: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        lowStockThreshold: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10
        },
        costs: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        },
        profitMargin: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 20
        },
        imageUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        media: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        }
    },
    {
        sequelize,
        tableName: 'products',
        timestamps: true
    }
);

export default Product;
