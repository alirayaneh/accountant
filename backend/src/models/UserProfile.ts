import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserProfileAttributes {
    id: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    role: 'user' | 'employee' | 'superadmin';
    password?: string;
    authProvider?: 'local' | 'google' | 'telegram';
    providerId?: string;
    ownerId?: string;
    employeeId?: string;
}

class UserProfile extends Model<UserProfileAttributes> implements UserProfileAttributes {
    public id!: string;
    public email?: string;
    public displayName?: string;
    public photoURL?: string;
    public role!: 'user' | 'employee' | 'superadmin';
    public password?: string;
    public authProvider?: 'local' | 'google' | 'telegram';
    public providerId?: string;
    public ownerId?: string;
    public employeeId?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

UserProfile.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true
        },
        displayName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        photoURL: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        role: {
            type: DataTypes.ENUM('user', 'employee', 'superadmin'),
            allowNull: false,
            defaultValue: 'user'
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true
        },
        authProvider: {
            type: DataTypes.ENUM('local', 'google', 'telegram'),
            allowNull: true
        },
        providerId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ownerId: {
            type: DataTypes.STRING,
            allowNull: true
        },
        employeeId: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'user_profiles',
        timestamps: true
    }
);

export default UserProfile;
