import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface LicenseActivationAttributes {
    id?: number;
    licenseId: string;
    machineId: string;
    validationToken: string;
    lastValidatedAt?: Date | null;
    nextCheckAt?: Date | null;
}

class LicenseActivation extends Model<LicenseActivationAttributes> implements LicenseActivationAttributes {
    public id!: number;
    public licenseId!: string;
    public machineId!: string;
    public validationToken!: string;
    public lastValidatedAt?: Date | null;
    public nextCheckAt?: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

LicenseActivation.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        licenseId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        machineId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        validationToken: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        lastValidatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        nextCheckAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'license_activations',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['licenseId', 'machineId'],
            },
        ],
    }
);

export default LicenseActivation;
