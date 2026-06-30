import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface LandingContact {
    type: 'telegram' | 'phone' | 'email' | 'website' | 'custom';
    label: string;
    value: string;
    href?: string;
}

export interface LandingSettingsAttributes {
    id: string;
    sectionTitle: string;
    contacts: LandingContact[];
}

class LandingSettings extends Model<LandingSettingsAttributes> implements LandingSettingsAttributes {
    public id!: string;
    public sectionTitle!: string;
    public contacts!: LandingContact[];

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

LandingSettings.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
            defaultValue: 'default',
        },
        sectionTitle: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'نمونه پروژه‌ها',
        },
        contacts: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
    },
    {
        sequelize,
        tableName: 'landing_settings',
        timestamps: true,
    }
);

export default LandingSettings;
