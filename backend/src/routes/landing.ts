import { Router } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { LandingPost, LandingSettings } from '../models';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

const DEFAULT_SETTINGS = {
    id: 'default',
    sectionTitle: 'نمونه پروژه‌ها',
    contacts: [] as LandingSettings['contacts'],
};

async function getOrCreateSettings() {
    let settings = await LandingSettings.findByPk('default');
    if (!settings) {
        settings = await LandingSettings.create(DEFAULT_SETTINGS);
    }
    return settings;
}

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

function serializePost(post: LandingPost) {
    return {
        id: post.id,
        title: post.title,
        description: post.description,
        badge: post.badge || undefined,
        previewUrl: post.previewUrl,
        previewType: post.previewType,
        body: post.body || undefined,
        bodyMediaUrl: post.bodyMediaUrl || undefined,
        bodyMediaType: post.bodyMediaType || undefined,
        tags: parseArrayField<string>(post.tags),
        links: parseArrayField<{ label: string; url: string }>(post.links),
        sortOrder: post.sortOrder,
        isPublished: post.isPublished,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
    };
}

function serializeSettings(settings: LandingSettings) {
    return {
        sectionTitle: settings.sectionTitle,
        contacts: parseArrayField(settings.contacts),
    };
}

function tryDeleteUploadFile(fileUrl?: string | null) {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filename = path.basename(fileUrl);
    const filePath = path.resolve(uploadDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

router.get('/', async (_req, res) => {
    try {
        const [posts, settings] = await Promise.all([
            LandingPost.findAll({
                where: { isPublished: true },
                order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
            }),
            getOrCreateSettings(),
        ]);

        res.json({
            posts: posts.map(serializePost),
            settings: serializeSettings(settings),
        });
    } catch (error) {
        console.error('Get landing content error:', error);
        res.status(500).json({ error: 'Failed to fetch landing content' });
    }
});

router.get('/admin', authenticateToken, requireAdmin, async (_req, res) => {
    try {
        const [posts, settings] = await Promise.all([
            LandingPost.findAll({
                order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
            }),
            getOrCreateSettings(),
        ]);

        res.json({
            posts: posts.map(serializePost),
            settings: serializeSettings(settings),
        });
    } catch (error) {
        console.error('Get landing admin content error:', error);
        res.status(500).json({ error: 'Failed to fetch landing content' });
    }
});

router.post('/posts', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            badge,
            previewUrl,
            previewType,
            body,
            bodyMediaUrl,
            bodyMediaType,
            tags,
            links,
            sortOrder,
            isPublished,
        } = req.body;

        if (!title || !description || !previewUrl || !previewType) {
            return res.status(400).json({ error: 'title, description, previewUrl, and previewType are required' });
        }

        const post = await LandingPost.create({
            id: randomUUID(),
            title,
            description,
            badge: badge || null,
            previewUrl,
            previewType,
            body: body || null,
            bodyMediaUrl: bodyMediaUrl || null,
            bodyMediaType: bodyMediaType || null,
            tags: Array.isArray(tags) ? tags : [],
            links: Array.isArray(links) ? links : [],
            sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
            isPublished: isPublished !== false,
        });

        res.status(201).json(serializePost(post));
    } catch (error) {
        console.error('Create landing post error:', error);
        res.status(500).json({ error: 'Failed to create landing post' });
    }
});

router.put('/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const post = await LandingPost.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const {
            title,
            description,
            badge,
            previewUrl,
            previewType,
            body,
            bodyMediaUrl,
            bodyMediaType,
            tags,
            links,
            sortOrder,
            isPublished,
        } = req.body;

        if (previewUrl && previewUrl !== post.previewUrl) {
            tryDeleteUploadFile(post.previewUrl);
        }
        if (bodyMediaUrl !== undefined && bodyMediaUrl !== post.bodyMediaUrl) {
            tryDeleteUploadFile(post.bodyMediaUrl);
        }

        await post.update({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(badge !== undefined && { badge: badge || null }),
            ...(previewUrl !== undefined && { previewUrl }),
            ...(previewType !== undefined && { previewType }),
            ...(body !== undefined && { body: body || null }),
            ...(bodyMediaUrl !== undefined && { bodyMediaUrl: bodyMediaUrl || null }),
            ...(bodyMediaType !== undefined && { bodyMediaType: bodyMediaType || null }),
            ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
            ...(links !== undefined && { links: Array.isArray(links) ? links : [] }),
            ...(sortOrder !== undefined && { sortOrder }),
            ...(isPublished !== undefined && { isPublished }),
        });

        res.json(serializePost(post));
    } catch (error) {
        console.error('Update landing post error:', error);
        res.status(500).json({ error: 'Failed to update landing post' });
    }
});

router.delete('/posts/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const post = await LandingPost.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        tryDeleteUploadFile(post.previewUrl);
        tryDeleteUploadFile(post.bodyMediaUrl);
        await post.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete landing post error:', error);
        res.status(500).json({ error: 'Failed to delete landing post' });
    }
});

router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { sectionTitle, contacts } = req.body;
        const settings = await getOrCreateSettings();

        await settings.update({
            ...(sectionTitle !== undefined && { sectionTitle }),
            ...(contacts !== undefined && { contacts: Array.isArray(contacts) ? contacts : [] }),
        });

        res.json(serializeSettings(settings));
    } catch (error) {
        console.error('Update landing settings error:', error);
        res.status(500).json({ error: 'Failed to update landing settings' });
    }
});

export default router;
