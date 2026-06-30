import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'grace' | 'inactive';

export interface LicenseInfoAttributes {
    id?: number;
    licenseKeyHash?: string | null;
    licenseId?: string | null;
    validationToken?: string | null;
    expiresAt?: Date | null;
    lastSuccessfulCheckAt?: Date | null;
    nextCheckAt?: Date | null;
    machineId?: string | null;
    status: LicenseStatus;
}

class LicenseInfo extends Model<LicenseInfoAttributes> implements LicenseInfoAttributes {
    public id!: number;
    public licenseKeyHash?: string | null;
    public licenseId?: string | null;
    public validationToken?: string | null;
    public expiresAt?: Date | null;
    public lastSuccessfulCheckAt?: Date | null;
    public nextCheckAt?: Date | null;
    public machineId?: string | null;
    public status!: LicenseStatus;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

LicenseInfo.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        licenseKeyHash: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        licenseId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        validationToken: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        lastSuccessfulCheckAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        nextCheckAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        machineId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'inactive',
        },
    },
    {
        sequelize,
        tableName: 'license_info',
        timestamps: true,
    }
);

export default LicenseInfo;
