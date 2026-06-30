import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface ExchangeRateAttributes {
    id?: number;
    userId: string;
    currency: 'USD' | 'AED' | 'CNY';
    rate: number;
}

class ExchangeRate extends Model<ExchangeRateAttributes> implements ExchangeRateAttributes {
    public id!: number;
    public userId!: string;
    public currency!: 'USD' | 'AED' | 'CNY';
    public rate!: number;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

ExchangeRate.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        currency: {
            type: DataTypes.ENUM('USD', 'AED', 'CNY'),
            allowNull: false
        },
        rate: {
            type: DataTypes.FLOAT,
            allowNull: false
        }
    },
    {
        sequelize,
        tableName: 'exchange_rates',
        timestamps: true,
        // Composite index is created in migrateExchangeRatesLegacyIndex() for existing DBs.
        indexes: [],
    }
);

export default ExchangeRate;
