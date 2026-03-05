const User = require('../models/User');

/**
 * Middleware: rejects requests from blocked users.
 * Must be placed AFTER authenticateJwt (needs req.user.id).
 */
async function checkBlocked(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('isBlocked blockReason');
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (user.isBlocked) {
      return res.status(403).json({
        error: 'Your account has been blocked',
        reason: user.blockReason || 'Please contact support for more information.',
        isBlocked: true,
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify account status' });
  }
}

module.exports = checkBlocked;
