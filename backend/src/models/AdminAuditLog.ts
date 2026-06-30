import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export type AdminAuditAction = 'impersonate_start' | 'impersonate_stop';

export interface AdminAuditLogAttributes {
    id?: number;
    adminId: string;
    targetUserId?: string | null;
    action: AdminAuditAction;
    ipAddress?: string | null;
}

class AdminAuditLog extends Model<AdminAuditLogAttributes> implements AdminAuditLogAttributes {
    public id!: number;
    public adminId!: string;
    public targetUserId?: string | null;
    public action!: AdminAuditAction;
    public ipAddress?: string | null;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

AdminAuditLog.init(
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        adminId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        targetUserId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'admin_audit_logs',
        timestamps: true,
        updatedAt: false,
    }
);

export default AdminAuditLog;
