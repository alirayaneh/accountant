import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type { ProductMedia } from './Product';

export interface AttachmentAttributes {
    id: string;
    userId: string;
    sourceId: string;
    sourceType: 'sale' | 'expense' | 'payment';
    date: string;
    description?: string;
    receiptNumber?: string;
    receiptImage?: string;
    media?: ProductMedia[];
}

class Attachment extends Model<AttachmentAttributes> implements AttachmentAttributes {
    public id!: string;
    public userId!: string;
    public sourceId!: string;
    public sourceType!: 'sale' | 'expense' | 'payment';
    public date!: string;
    public description?: string;
    public receiptNumber?: string;
    public receiptImage?: string;
    public media?: ProductMedia[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Attachment.init(
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
        sourceId: {
            type: DataTypes.STRING,
            allowNull: false,
            references: {
                model: 'payments',
                key: 'id'
            }
        },
        sourceType: {
            type: DataTypes.ENUM('sale', 'expense', 'payment'),
            allowNull: false
        },
        date: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        receiptNumber: {
            type: DataTypes.STRING,
            allowNull: true
        },
        receiptImage: {
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
        tableName: 'attachments',
        timestamps: true,
        indexes: [
            {
                fields: ['sourceId']
            }
        ]
    }
);

export default Attachment;
