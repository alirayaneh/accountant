import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface LandingPostLink {
    label: string;
    url: string;
}

export interface LandingPostAttributes {
    id: string;
    title: string;
    description: string;
    badge?: string;
    previewUrl: string;
    previewType: 'image' | 'video';
    body?: string;
    bodyMediaUrl?: string;
    bodyMediaType?: 'image' | 'video';
    tags: string[];
    links: LandingPostLink[];
    sortOrder: number;
    isPublished: boolean;
}

class LandingPost extends Model<LandingPostAttributes> implements LandingPostAttributes {
    public id!: string;
    public title!: string;
    public description!: string;
    public badge?: string;
    public previewUrl!: string;
    public previewType!: 'image' | 'video';
    public body?: string;
    public bodyMediaUrl?: string;
    public bodyMediaType?: 'image' | 'video';
    public tags!: string[];
    public links!: LandingPostLink[];
    public sortOrder!: number;
    public isPublished!: boolean;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

LandingPost.init(
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
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        badge: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        previewUrl: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        previewType: {
            type: DataTypes.ENUM('image', 'video'),
            allowNull: false,
            defaultValue: 'image',
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        bodyMediaUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bodyMediaType: {
            type: DataTypes.ENUM('image', 'video'),
            allowNull: true,
        },
        tags: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        links: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        isPublished: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'landing_posts',
        timestamps: true,
    }
);

export default LandingPost;
