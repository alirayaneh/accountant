import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface AppSettingsAttributes {
    id?: number;
    userId: string;
    shopName?: string;
}

class AppSettings extends Model<AppSettingsAttributes> implements AppSettingsAttributes {
    public id!: number;
    public userId!: string;
    public shopName?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

AppSettings.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        shopName: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'app_settings',
        timestamps: true
    }
);

export default AppSettings;
