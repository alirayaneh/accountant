import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

let sequelize: Sequelize;

if (dbType === 'mysql') {
    sequelize = new Sequelize({
        dialect: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME || 'easystock',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    // SQLite
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.SQLITE_PATH || './database.sqlite',
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    });
}

export { sequelize };
