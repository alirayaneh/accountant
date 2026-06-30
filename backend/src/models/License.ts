import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export type LicensePlan = 'free' | 'paid';
export type IssuedLicenseStatus = 'active' | 'revoked' | 'expired';

export interface LicenseAttributes {
    id: string;
    userId: string;
    licenseKeyHash: string;
    productId: string;
    plan: LicensePlan;
    status: IssuedLicenseStatus;
    expiresAt?: Date | null;
    maxMachines: number;
    keyHint?: string | null;
}

class License extends Model<LicenseAttributes> implements LicenseAttributes {
    public id!: string;
    public userId!: string;
    public licenseKeyHash!: string;
    public productId!: string;
    public plan!: LicensePlan;
    public status!: IssuedLicenseStatus;
    public expiresAt?: Date | null;
    public maxMachines!: number;
    public keyHint?: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

License.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        licenseKeyHash: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        productId: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'easystock-accountant',
        },
        plan: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'free',
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'active',
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        maxMachines: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        keyHint: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'licenses',
        timestamps: true,
    }
);

export default License;
