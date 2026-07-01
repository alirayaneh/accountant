import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export type DesktopNotificationSeverity = 'info' | 'warning' | 'critical';
export type DesktopNotificationAudience = 'public' | 'license';

export interface DesktopNotificationAttributes {
    id: string;
    title: string;
    body: string;
    severity: DesktopNotificationSeverity;
    audience: DesktopNotificationAudience;
    targetLicenseIds: string[];
    isPublished: boolean;
    publishedAt?: Date | null;
    expiresAt?: Date | null;
}

class DesktopNotification extends Model<DesktopNotificationAttributes> implements DesktopNotificationAttributes {
    public id!: string;
    public title!: string;
    public body!: string;
    public severity!: DesktopNotificationSeverity;
    public audience!: DesktopNotificationAudience;
    public targetLicenseIds!: string[];
    public isPublished!: boolean;
    public publishedAt?: Date | null;
    public expiresAt?: Date | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

DesktopNotification.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        severity: {
            type: DataTypes.ENUM('info', 'warning', 'critical'),
            allowNull: false,
            defaultValue: 'info',
        },
        audience: {
            type: DataTypes.ENUM('public', 'license'),
            allowNull: false,
            defaultValue: 'public',
        },
        targetLicenseIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        isPublished: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        publishedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'desktop_notifications',
        timestamps: true,
    }
);

export default DesktopNotification;
