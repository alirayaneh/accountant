import UserProfile from '../models/UserProfile';

function getSuperadminEmails(): Set<string> {
    const raw = process.env.SUPERADMIN_EMAILS || '';
    return new Set(
        raw
            .split(',')
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
    );
}

export function isSuperadminEmail(email?: string | null): boolean {
    if (!email) return false;
    return getSuperadminEmails().has(email.trim().toLowerCase());
}

export async function ensureSuperadminRole(user: UserProfile): Promise<UserProfile> {
    if (!isSuperadminEmail(user.email)) {
        return user;
    }

    if (user.role === 'superadmin') {
        return user;
    }

    await user.update({ role: 'superadmin' });
    return user.reload();
}
