function parseVersion(version: string): [number, number, number] {
    const core = version.trim().split('-')[0];
    const parts = core.split('.').map((p) => parseInt(p, 10) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 {
    const [aMajor, aMinor, aPatch] = parseVersion(a);
    const [bMajor, bMinor, bPatch] = parseVersion(b);

    if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1;
    if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1;
    if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
    return 0;
}

export function isNewerVersion(latest: string, current: string): boolean {
    return compareSemver(latest, current) > 0;
}
