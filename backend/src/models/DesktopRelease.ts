import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export type DesktopReleasePlatform = 'linux' | 'win' | 'all';

export interface DesktopReleaseAttributes {
    id: string;
    version: string;
    platform: DesktopReleasePlatform;
    downloadUrl: string;
    releaseNotes: string;
    isPublished: boolean;
    publishedAt?: Date | null;
    minSupportedVersion?: string | null;
}

class DesktopRelease extends Model<DesktopReleaseAttributes> implements DesktopReleaseAttributes {
    public id!: string;
    public version!: string;
    public platform!: DesktopReleasePlatform;
    public downloadUrl!: string;
    public releaseNotes!: string;
    public isPublished!: boolean;
    public publishedAt?: Date | null;
    public minSupportedVersion?: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

DesktopRelease.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        version: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        platform: {
            type: DataTypes.ENUM('linux', 'win', 'all'),
            allowNull: false,
            defaultValue: 'all',
        },
        downloadUrl: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        releaseNotes: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '',
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
        minSupportedVersion: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'desktop_releases',
        timestamps: true,
    }
);

export default DesktopRelease;
