import { Router } from 'express';
import { Attachment } from '../models';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { tenantWhere } from '../middleware/tenant';
import { parseArrayField } from '../utils/json';

const router = Router();

const serializeAttachment = (attachment: Attachment) => {
    const data = attachment.toJSON();
    const { userId, ...rest } = data;
    return {
        ...rest,
        media: parseArrayField(rest.media),
    };
};

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { sourceId } = req.query;

        if (!sourceId) {
            return res.status(400).json({ error: 'sourceId query parameter required' });
        }

        const attachments = await Attachment.findAll({
            where: tenantWhere(req, { sourceId: sourceId as string })
        });

        res.json(attachments.map(serializeAttachment));
    } catch (error) {
        console.error('Get attachments error:', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});

export default router;
