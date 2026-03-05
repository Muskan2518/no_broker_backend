const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateJwt = require('../utils/authenticateJwt');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/admin/users?search=&role=&blocked=
router.get('/users', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { search, role, blocked } = req.query;
    const query = { role: { $ne: 'admin' } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'all' && role !== 'admin') {
      query.role = role;
    }

    if (blocked && blocked !== 'all') {
      query.isBlocked = blocked === 'true';
    }

    const users = await User.find(query)
      .select('name email phoneNumber role isVerified isBlocked blockReason createdAt')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/block/:userId  body: { action: 'block' | 'unblock', reason?: string }
router.patch('/block/:userId', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: 'action must be "block" or "unblock"' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot block admin users' });
    }

    if (action === 'block') {
      user.isBlocked = true;
      user.blockReason = reason || 'No reason provided';
    } else {
      user.isBlocked = false;
      user.blockReason = undefined;
    }

    await user.save();

    const msg = action === 'block' ? 'User blocked successfully' : 'User unblocked successfully';
    res.json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;
