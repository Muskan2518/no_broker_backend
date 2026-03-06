const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const User = require('../models/User');
const Fraud = require('../models/Fraud');
const PropertyLead = require('../models/PropertyLead');
const authenticateJwt = require('../utils/authenticateJwt');
const requireAdmin = require('../middleware/requireAdmin');

// GET /api/admin/dashboard/stats - Get platform-wide statistics
router.get('/stats', authenticateJwt, requireAdmin, async (req, res) => {
  try {
    // Count total users (excluding admins)
    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

    // Count active properties
    const activeProperties = await Property.countDocuments({ status: 'active' });

    // Count total properties
    const totalProperties = await Property.countDocuments();

    // Count fraud reports
    const fraudReports = await Fraud.countDocuments();

    // Count open fraud reports
    const openFraudReports = await Fraud.countDocuments({ status: 'open' });

    // Count leads
    const totalLeads = await PropertyLead.countDocuments();

    // Get recently created properties (last 5)
    const recentProperties = await Property.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title listingType propertyType price address status createdAt')
      .lean();

    // Get recently registered users (last 5, excluding admins)
    const recentUsers = await User.find({ role: { $ne: 'admin' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role isVerified createdAt')
      .lean();

    res.json({
      stats: {
        totalUsers,
        activeProperties,
        totalProperties,
        fraudReports,
        openFraudReports,
        totalLeads,
      },
      recentProperties,
      recentUsers,
    });
  } catch (err) {
    console.error('[Admin Dashboard Stats] Error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;
