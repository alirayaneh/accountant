const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
});

async function checkUser() {
    try {
        const [results] = await sequelize.query(
            "SELECT id, email, displayName, role, authProvider FROM user_profiles WHERE email='php.modern@gmail.com'"
        );
        console.log('User found:', JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkUser();
