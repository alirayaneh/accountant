import dotenv from 'dotenv';
import { sequelize } from '../src/config/database';
import { UserProfile } from '../src/models';
import { ensureSuperadminRole } from '../src/utils/superadmin';

dotenv.config();

async function main() {
    const email = process.argv[2] || process.env.SUPERADMIN_EMAILS?.split(',')[0]?.trim();

    if (!email) {
        console.error('Usage: npx tsx scripts/promote-superadmin.ts [email]');
        process.exit(1);
    }

    await sequelize.authenticate();

    const user = await UserProfile.findOne({ where: { email } });
    if (!user) {
        console.error(`User not found: ${email}`);
        process.exit(1);
    }

    const updated = await ensureSuperadminRole(user);
    console.log(`Promoted ${updated.email} to role: ${updated.role}`);
    await sequelize.close();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
