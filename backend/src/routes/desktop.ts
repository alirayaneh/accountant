import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Op } from 'sequelize';
import { DesktopNotification, DesktopRelease } from '../models';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import {
    authenticateDesktopLicense,
    DesktopLicenseRequest,
} from '../middleware/desktop-license';
import { desktopRateLimit } from '../middleware/desktop-rate-limit';
import { compareSemver, isNewerVersion } from '../utils/semver';

const router = Router();

function parseArrayField<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function serializeNotification(row: DesktopNotification) {
    return {
        id: row.id,
        title: row.title,
        body: row.body,
        severity: row.severity,
        audience: row.audience,
        targetLicenseIds: parseArrayField<string>(row.targetLicenseIds),
        isPublished: row.isPublished,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function serializeRelease(row: DesktopRelease) {
    return {
        id: row.id,
        version: row.version,
        platform: row.platform,
        downloadUrl: row.downloadUrl,
        releaseNotes: row.releaseNotes,
        isPublished: row.isPublished,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        minSupportedVersion: row.minSupportedVersion ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function notificationMatchesLicense(row: DesktopNotification, licenseId: string): boolean {
    if (row.audience === 'public') return true;
    const targets = parseArrayField<string>(row.targetLicenseIds);
    if (targets.length === 0) return true;
    return targets.includes(licenseId);
}

router.get(
    '/notifications',
    authenticateDesktopLicense,
    desktopRateLimit,
    async (req: DesktopLicenseRequest, res: Response) => {
        try {
            const licenseId = req.desktopLicense!.licenseId;
            const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 50);
            const since = typeof req.query.since === 'string' ? new Date(req.query.since) : null;
            const now = new Date();

            const rows = await DesktopNotification.findAll({
                where: {
                    isPublished: true,
                    publishedAt: {
                        [Op.lte]: now,
                        ...(since && !Number.isNaN(since.getTime()) ? { [Op.gt]: since } : {}),
                    },
                    [Op.or]: [
                        { expiresAt: null },
                        { expiresAt: { [Op.gt]: now } },
                    ],
                },
                order: [['publishedAt', 'DESC']],
                limit: 100,
            });

            const filtered = rows
                .filter((row) => notificationMatchesLicense(row, licenseId))
                .slice(0, limit)
                .map((row) => ({
                    id: row.id,
                    title: row.title,
                    body: row.body,
                    severity: row.severity,
                    publishedAt: row.publishedAt?.toISOString() ?? row.createdAt.toISOString(),
                    isRead: false,
                }));

            res.json({
                notifications: filtered,
                unreadCount: filtered.length,
            });
        } catch (error) {
            console.error('Get desktop notifications error:', error);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }
);

router.get(
    '/updates/check',
    authenticateDesktopLicense,
    desktopRateLimit,
    async (req: Request, res: Response) => {
        try {
            const currentVersion = String(req.query.current_version || '').trim();
            const platform = String(req.query.platform || '').trim();

            if (!currentVersion) {
                return res.status(400).json({ error: 'current_version is required' });
            }
            if (platform !== 'linux' && platform !== 'win') {
                return res.status(400).json({ error: 'platform must be linux or win' });
            }

            const now = new Date();
            const releases = await DesktopRelease.findAll({
                where: {
                    isPublished: true,
                    platform: { [Op.in]: [platform, 'all'] },
                    publishedAt: { [Op.lte]: now },
                },
            });

            if (releases.length === 0) {
                return res.json({
                    updateAvailable: false,
                    currentVersion,
                    latestVersion: currentVersion,
                    mandatory: false,
                });
            }

            const sorted = [...releases].sort((a, b) => compareSemver(b.version, a.version));
            const latest = sorted[0];
            const updateAvailable = isNewerVersion(latest.version, currentVersion);
            const mandatory = latest.minSupportedVersion
                ? compareSemver(currentVersion, latest.minSupportedVersion) < 0
                : false;

            res.json({
                updateAvailable,
                currentVersion,
                latestVersion: latest.version,
                downloadUrl: latest.downloadUrl,
                releaseNotes: latest.releaseNotes,
                mandatory,
            });
        } catch (error) {
            console.error('Desktop update check error:', error);
            res.status(500).json({ error: 'Failed to check for updates' });
        }
    }
);

// Admin: notifications
router.post('/admin/notifications', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const {
            title,
            body,
            severity,
            audience,
            targetLicenseIds,
            isPublished,
            publishedAt,
            expiresAt,
        } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'title and body are required' });
        }

        const row = await DesktopNotification.create({
            id: randomUUID(),
            title,
            body,
            severity: severity || 'info',
            audience: audience || 'public',
            targetLicenseIds: Array.isArray(targetLicenseIds) ? targetLicenseIds : [],
            isPublished: isPublished === true,
            publishedAt: publishedAt ? new Date(publishedAt) : isPublished ? new Date() : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        });

        res.status(201).json(serializeNotification(row));
    } catch (error) {
        console.error('Create desktop notification error:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

router.put('/admin/notifications/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const row = await DesktopNotification.findByPk(req.params.id);
        if (!row) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        const {
            title,
            body,
            severity,
            audience,
            targetLicenseIds,
            isPublished,
            publishedAt,
            expiresAt,
        } = req.body;

        await row.update({
            ...(title !== undefined && { title }),
            ...(body !== undefined && { body }),
            ...(severity !== undefined && { severity }),
            ...(audience !== undefined && { audience }),
            ...(targetLicenseIds !== undefined && {
                targetLicenseIds: Array.isArray(targetLicenseIds) ? targetLicenseIds : [],
            }),
            ...(isPublished !== undefined && { isPublished }),
            ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
            ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        });

        res.json(serializeNotification(row));
    } catch (error) {
        console.error('Update desktop notification error:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

router.delete('/admin/notifications/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const row = await DesktopNotification.findByPk(req.params.id);
        if (!row) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        await row.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Delete desktop notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Admin: releases
router.post('/admin/releases', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const {
            version,
            platform,
            downloadUrl,
            releaseNotes,
            isPublished,
            publishedAt,
            minSupportedVersion,
        } = req.body;

        if (!version || !downloadUrl) {
            return res.status(400).json({ error: 'version and downloadUrl are required' });
        }

        const row = await DesktopRelease.create({
            id: randomUUID(),
            version,
            platform: platform || 'all',
            downloadUrl,
            releaseNotes: releaseNotes || '',
            isPublished: isPublished === true,
            publishedAt: publishedAt ? new Date(publishedAt) : isPublished ? new Date() : null,
            minSupportedVersion: minSupportedVersion || null,
        });

        res.status(201).json(serializeRelease(row));
    } catch (error) {
        console.error('Create desktop release error:', error);
        res.status(500).json({ error: 'Failed to create release' });
    }
});

router.put('/admin/releases/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const row = await DesktopRelease.findByPk(req.params.id);
        if (!row) {
            return res.status(404).json({ error: 'Release not found' });
        }

        const {
            version,
            platform,
            downloadUrl,
            releaseNotes,
            isPublished,
            publishedAt,
            minSupportedVersion,
        } = req.body;

        await row.update({
            ...(version !== undefined && { version }),
            ...(platform !== undefined && { platform }),
            ...(downloadUrl !== undefined && { downloadUrl }),
            ...(releaseNotes !== undefined && { releaseNotes }),
            ...(isPublished !== undefined && { isPublished }),
            ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
            ...(minSupportedVersion !== undefined && { minSupportedVersion: minSupportedVersion || null }),
        });

        res.json(serializeRelease(row));
    } catch (error) {
        console.error('Update desktop release error:', error);
        res.status(500).json({ error: 'Failed to update release' });
    }
});

router.delete('/admin/releases/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const row = await DesktopRelease.findByPk(req.params.id);
        if (!row) {
            return res.status(404).json({ error: 'Release not found' });
        }
        await row.destroy();
        res.status(204).send();
    } catch (error) {
        console.error('Delete desktop release error:', error);
        res.status(500).json({ error: 'Failed to delete release' });
    }
});

export default router;
