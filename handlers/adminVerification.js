const express = require('express');
const router = express.Router();
const SellerProfile = require('../models/SellerProfile');
const User = require('../models/User');
const UserAudit = require('../models/UserAudit');
const s3 = require('../database/s3setup');
const authenticateJwt = require('../utils/authenticateJwt');
const requireAdmin = require('../middleware/requireAdmin');

const bucketName = process.env.AWS_BUCKET || 'broker';

// GET /api/admin/verifications?status=pending|verified|rejected|all
router.get('/verifications', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const query = status === 'all' ? {} : { verificationStatus: status };

    const profiles = await SellerProfile.find(query)
      .populate('uid', 'name email phoneNumber role isVerified')
      .sort({ createdAt: -1 });

    res.json({ verifications: profiles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

// PATCH /api/admin/verify/:userId  body: { action: 'approve' | 'reject' | 'unverify' }
router.patch('/verify/:userId', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { action } = req.body;
    if (!['approve', 'reject', 'unverify'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve", "reject", or "unverify"' });
    }

    const newStatus = action === 'approve' ? 'verified'
      : action === 'reject' ? 'rejected'
      : 'pending'; // unverify resets to pending

    const profile = await SellerProfile.findOneAndUpdate(
      { uid: req.params.userId },
      { verificationStatus: newStatus },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    // Sync User.isVerified
    const isVerified = action === 'approve';
    await User.findByIdAndUpdate(req.params.userId, { isVerified });

    // Write audit log
    const auditType = action === 'approve' ? 'VERIFIED'
      : action === 'reject' ? 'UNVERIFIED'
      : 'UNVERIFIED';

    await UserAudit.create({
      uid: req.params.userId,
      actionType: auditType,
      previousValue: action === 'unverify' ? true : undefined,
      newValue: isVerified,
      reason: action === 'unverify' ? 'Admin revoked verification' : undefined,
      performedBy: req.user.email || req.user.id,
      performedAt: new Date(),
    });

    const msg = action === 'approve' ? 'Seller verified successfully'
      : action === 'reject' ? 'Seller rejected'
      : 'Seller verification revoked';

    res.json({ message: msg, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// GET /api/admin/image/:objectName  → returns pre-signed S3 URL (5 min expiry)
router.get('/image/:objectName', authenticateJwt, requireAdmin, (req, res) => {
  try {
    const url = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: req.params.objectName,
      Expires: 300,
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate image URL' });
  }
});

// GET /api/admin/users?search=&role=&blocked=
router.get('/users', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { search, role, blocked } = req.query;
    const query = { role: { $ne: 'admin' } };
    if (role && role !== 'all' && role !== 'admin') query.role = role;
    if (blocked === 'true') query.isBlocked = true;
    if (blocked === 'false') query.isBlocked = false;
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('name email phoneNumber role isVerified isBlocked blockReason createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/block/:userId  body: { action: 'block'|'unblock', reason? }
router.patch('/block/:userId', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    const { action, reason } = req.body;
    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: 'action must be "block" or "unblock"' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot block admin users' });

    const isBlocking = action === 'block';
    const updateData = isBlocking
      ? { isBlocked: true, blockReason: reason?.trim() || 'Blocked by administrator' }
      : { isBlocked: false, blockReason: null };

    await User.findByIdAndUpdate(req.params.userId, updateData, { new: true });

    await UserAudit.create({
      uid: req.params.userId,
      actionType: isBlocking ? 'BLOCKED' : 'UNBLOCKED',
      reason: isBlocking
        ? (reason?.trim() || 'Blocked by administrator')
        : 'Admin removed block',
      performedBy: req.user.email || req.user.id,
      performedAt: new Date(),
    });

    res.json({
      message: isBlocking ? 'User blocked successfully' : 'User unblocked successfully',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update block status' });
  }
});

module.exports = router;
