import { Router } from 'express';
import { UserProfile } from '../models';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await UserProfile.findAll({
            attributes: ['id', 'email', 'displayName', 'photoURL', 'role', 'createdAt']
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await UserProfile.findByPk(req.user.id, {
            attributes: ['id', 'email', 'displayName', 'photoURL', 'role']
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { displayName, photoURL } = req.body;

        await UserProfile.update(
            { displayName, photoURL },
            { where: { id: req.user.id } }
        );

        const updated = await UserProfile.findByPk(req.user.id, {
            attributes: ['id', 'email', 'displayName', 'photoURL', 'role']
        });

        res.json(updated);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
