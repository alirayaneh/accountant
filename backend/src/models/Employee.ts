import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export interface EmployeeAttributes {
    id: string;
    userId: string;
    name: string;
    position: string;
    salary: number;
    recurringExpenseId: string;
    isActive: boolean;
    userProfileId?: string;
}

class Employee extends Model<EmployeeAttributes> implements EmployeeAttributes {
    public id!: string;
    public userId!: string;
    public name!: string;
    public position!: string;
    public salary!: number;
    public recurringExpenseId!: string;
    public isActive!: boolean;
    public userProfileId?: string;

    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Employee.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false
        },
        userId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        position: {
            type: DataTypes.STRING,
            allowNull: false
        },
        salary: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        recurringExpenseId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        userProfileId: {
            type: DataTypes.STRING,
            allowNull: true
        }
    },
    {
        sequelize,
        tableName: 'employees',
        timestamps: true
    }
);

export default Employee;
