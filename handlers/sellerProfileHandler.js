const express = require('express');
const router = express.Router();
const SellerProfile = require('../models/SellerProfile');
const authenticateJwt = require('../utils/authenticateJwt');
const checkBlocked = require('../middleware/checkBlocked');

// GET /api/seller-profile/status
router.get('/status', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const profile = await SellerProfile.findOne({ uid: req.user.id });
    res.json({ verificationStatus: profile?.verificationStatus || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

// POST /api/seller-profile/submit-id
// Called after file upload — links the S3 key + ID info to the seller's profile
router.post('/submit-id', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const { govtIdType, govtId, govtIdImage } = req.body;

    if (!govtIdImage) {
      return res.status(400).json({ error: 'govtIdImage (S3 key) is required' });
    }

    // Never downgrade an already-verified seller back to pending
    const existing = await SellerProfile.findOne({ uid: req.user.id });
    if (existing?.verificationStatus === 'verified') {
      return res.status(400).json({ error: 'Your ID is already verified. No resubmission needed.' });
    }

    const profile = await SellerProfile.findOneAndUpdate(
      { uid: req.user.id },
      {
        govtIdTypeName: govtIdType,
        govtId,
        govtIdImage,
        verificationStatus: 'pending',
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'ID submitted for verification', status: profile.verificationStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit ID for verification' });
  }
});

module.exports = router;
