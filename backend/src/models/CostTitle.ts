import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface CostTitleAttributes {
    id: string;
    userId: string;
    title: string;
}

class CostTitle extends Model<CostTitleAttributes> implements CostTitleAttributes {
    public id!: string;
    public userId!: string;
    public title!: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

CostTitle.init(
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
        }
    },
    {
        sequelize,
        tableName: 'cost_titles',
        timestamps: true
    }
);

export default CostTitle;
