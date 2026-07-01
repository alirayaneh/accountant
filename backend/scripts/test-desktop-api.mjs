/**
 * Manual verification script for desktop API endpoints.
 *
 * Semver unit checks (always run):
 *   node backend/scripts/test-desktop-api.mjs
 *
 * Live API checks (optional):
 *   DESKTOP_LICENSE_PAYLOAD_BASE64=<base64> API_BASE_URL=https://hesab.amoza.ir node backend/scripts/test-desktop-api.mjs
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

function parseVersion(version) {
    const core = version.trim().split('-')[0];
    const parts = core.split('.').map((p) => parseInt(p, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function compareSemver(a, b) {
    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);
    if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1;
    if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1;
    if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
    return 0;
}

function isNewerVersion(latest, current) {
    return compareSemver(latest, current) > 0;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(compareSemver('0.2.0', '0.1.0') === 1, '0.2.0 > 0.1.0');
assert(compareSemver('0.1.0', '0.2.0') === -1, '0.1.0 < 0.2.0');
assert(compareSemver('1.0.0', '1.0.0') === 0, '1.0.0 == 1.0.0');
assert(isNewerVersion('0.2.0', '0.1.0') === true, 'isNewerVersion true');
assert(isNewerVersion('0.1.0', '0.2.0') === false, 'isNewerVersion false');

console.log('semver utils: OK');

async function runIntegration() {
    const credentials = process.env.DESKTOP_LICENSE_PAYLOAD_BASE64;
    if (!credentials) {
        console.log('Skip integration: set DESKTOP_LICENSE_PAYLOAD_BASE64 to test live API');
        return;
    }

    const headers = { 'X-Desktop-License': credentials };

    const notifRes = await fetch(`${BASE_URL}/api/desktop/notifications?limit=5`, { headers });
    assert(notifRes.ok, `notifications failed: ${notifRes.status}`);
    const notifData = await notifRes.json();
    assert(Array.isArray(notifData.notifications), 'notifications array expected');
    console.log(`notifications: OK (${notifData.notifications.length} items)`);

    const updateRes = await fetch(
        `${BASE_URL}/api/desktop/updates/check?current_version=0.1.0&platform=linux`,
        { headers }
    );
    assert(updateRes.ok, `updates/check failed: ${updateRes.status}`);
    const updateData = await updateRes.json();
    assert(typeof updateData.updateAvailable === 'boolean', 'updateAvailable boolean expected');
    console.log(`updates/check: OK (updateAvailable=${updateData.updateAvailable})`);
}

runIntegration().catch((err) => {
    console.error(err);
    process.exit(1);
});
