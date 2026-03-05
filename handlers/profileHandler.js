const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserAudit = require('../models/UserAudit');
const authenticateJwt = require('../utils/authenticateJwt');
const checkBlocked = require('../middleware/checkBlocked');

// GET /api/profile — return own profile (also used as blocked-status check on mount)
router.get('/', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHashed -blockReason');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch profile' });
  }
});

// PATCH /api/profile — update name and/or phoneNumber; write audit log
router.patch('/', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const changes = {};

    if (name && name.trim() && name.trim() !== user.name) {
      changes.name = { old: user.name, new: name.trim() };
      user.name = name.trim();
    }

    if (phoneNumber && phoneNumber.trim() && phoneNumber.trim() !== user.phoneNumber) {
      changes.phoneNumber = { old: user.phoneNumber, new: phoneNumber.trim() };
      user.phoneNumber = phoneNumber.trim();
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ error: 'No changes detected' });
    }

    await user.save();

    await UserAudit.create({
      uid: user._id,
      actionType: 'PROFILE_UPDATE',
      changes,
      performedBy: user.email,
      performedAt: new Date(),
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

// GET /api/profile/audit — own audit log (profile changes only)
router.get('/audit', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const logs = await UserAudit.find({
      uid: req.user.id,
      actionType: 'PROFILE_UPDATE',
    })
      .sort({ performedAt: -1 })
      .limit(20)
      .lean();

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit log' });
  }
});

module.exports = router;
