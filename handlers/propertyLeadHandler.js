const express = require('express');
const router = express.Router();

const PropertyLead      = require('../models/PropertyLead');
const PropertyLeadAudit = require('../models/PropertyLeadAudit');
const Property          = require('../models/Property');
const authenticateJwt   = require('../utils/authenticateJwt');
const checkBlocked      = require('../middleware/checkBlocked');

/* ── fire-and-forget audit ─────────────────────────────────────── */
async function writeAudit({ lid, actionType, oldStatus, newStatus, reason, performedBy }) {
  try {
    await PropertyLeadAudit.create({
      lid,
      actionType,
      oldStatus,
      newStatus,
      reason,
      performedBy: performedBy ? String(performedBy) : null,
    });
  } catch (e) {
    console.error('[PropertyLeadAudit] write failed:', e.message);
  }
}

/* ── POST /api/property-leads — express interest ───────────────── */
router.post('/', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const { pid } = req.body;
    if (!pid) return res.status(400).json({ error: 'pid is required' });

    const property = await Property.findById(pid).lean();
    if (!property) return res.status(404).json({ error: 'Property not found' });

    if (String(property.owner) === String(req.user.id)) {
      return res.status(400).json({ error: 'You cannot express interest in your own property' });
    }

    // Deduplication — return existing lead if already interested
    const existing = await PropertyLead.findOne({ pid, uid: req.user.id }).lean();
    if (existing) {
      return res.status(200).json({ lead: existing, alreadyExists: true });
    }

    const lead = await PropertyLead.create({ pid, uid: req.user.id });
    await writeAudit({
      lid: lead._id,
      actionType: 'CREATED',
      newStatus: 'new',
      performedBy: req.user.id,
    });

    res.status(201).json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create lead' });
  }
});

/* ── DELETE /api/property-leads/:id — cancel interest ──────────── */
router.delete('/:id', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const lead = await PropertyLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (String(lead.uid) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const oldStatus = lead.status;
    await lead.deleteOne();
    await writeAudit({
      lid: lead._id,
      actionType: 'DELETED',
      oldStatus,
      performedBy: req.user.id,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to remove interest' });
  }
});

/* ── GET /api/property-leads/mine — buyer views their leads ─────── */
router.get('/mine', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    // Auto-delete closed/rejected leads older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await PropertyLead.deleteMany({ uid: req.user.id, status: { $in: ['closed', 'rejected'] }, closedAt: { $lte: cutoff } });

    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const skip  = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      PropertyLead.find({ uid: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'pid',
          select: 'title price listingType propertyType address images status amenities bedrooms bathrooms areaSquareFeet furnishing owner',
          populate: { path: 'owner', select: 'name email phoneNumber isVerified' },
        })
        .lean(),
      PropertyLead.countDocuments({ uid: req.user.id }),
    ]);

    res.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch your leads' });
  }
});

/* ── GET /api/property-leads/seller-summary — seller sees only
       properties that have ≥1 lead, with lead count per property ── */
router.get('/seller-summary', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId(String(req.user.id));

    const rows = await PropertyLead.aggregate([
      // join to get the property document
      {
        $lookup: {
          from: 'properties',
          localField: 'pid',
          foreignField: '_id',
          as: 'property',
        },
      },
      { $unwind: '$property' },
      // only leads for properties owned by this seller (or admin sees all)
      ...(req.user.role === 'admin'
        ? []
        : [{ $match: { 'property.owner': userId } }]),
      // group by property — active count (new/contacted) + total + latest activity
      {
        $group: {
          _id: '$pid',
          property:    { $first: '$property' },
          leadCount:   { $sum: { $cond: [{ $in: ['$status', ['new', 'contacted']] }, 1, 0] } },
          totalLeads:  { $sum: 1 },
          latestAt:    { $max: '$createdAt' },
        },
      },
      { $sort: { latestAt: -1 } },
      // shape the output
      {
        $project: {
          _id: 0,
          pid:        '$_id',
          leadCount:  1,
          totalLeads: 1,
          latestAt:   1,
          title:      '$property.title',
          images:     '$property.images',
          address:    '$property.address',
          status:     '$property.status',
        },
      },
    ]);

    res.json({ properties: rows });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch seller summary' });
  }
});

/* ── GET /api/property-leads/property/:pid — seller views leads ─── */
router.get('/property/:pid', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const property = await Property.findById(req.params.pid).lean();
    if (!property) return res.status(404).json({ error: 'Property not found' });

    if (String(property.owner) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip  = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      PropertyLead.find({ pid: req.params.pid })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'uid', select: 'name email phoneNumber isVerified role' })
        .lean(),
      PropertyLead.countDocuments({ pid: req.params.pid }),
    ]);

    res.json({ leads, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch property leads' });
  }
});

/* ── PATCH /api/property-leads/:id/status — seller/admin updates status ─ */
router.patch('/:id/status', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const VALID = ['new', 'contacted', 'closed', 'rejected'];
    const { status } = req.body;
    if (!VALID.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
    }

    const lead = await PropertyLead.findById(req.params.id).populate('pid', 'owner');
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const propOwner = lead.pid?.owner ? String(lead.pid.owner) : null;
    const isSeller = propOwner === String(req.user.id);
    if (!isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the property owner or admin can update lead status' });
    }

    const oldStatus = lead.status;
    lead.status = status;
    if (status === 'closed' || status === 'rejected') lead.closedAt = new Date();
    else lead.closedAt = null;
    await lead.save();

    await writeAudit({ lid: lead._id, actionType: 'STATUS_CHANGED', oldStatus, newStatus: status, performedBy: req.user.id });

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update lead status' });
  }
});

/* ── PATCH /api/property-leads/:id/contact — buyer marks as contacted ─ */
router.patch('/:id/contact', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const lead = await PropertyLead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (String(lead.uid) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (lead.status !== 'new') return res.json({ lead });

    lead.status = 'contacted';
    await lead.save();
    await writeAudit({ lid: lead._id, actionType: 'STATUS_CHANGED', oldStatus: 'new', newStatus: 'contacted', performedBy: req.user.id });

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update lead' });
  }
});

/* ── PATCH /api/property-leads/property/:pid/close-all — seller closes all leads for a property ─ */
router.patch('/property/:pid/close-all', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const property = await Property.findById(req.params.pid).lean();
    if (!property) return res.status(404).json({ error: 'Property not found' });

    if (String(property.owner) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const closedAt = new Date();

    // Find leads that will actually be closed (skip already-terminal ones)
    const toClose = await PropertyLead.find(
      { pid: req.params.pid, status: { $nin: ['closed', 'rejected'] } },
      '_id status'
    ).lean();

    if (toClose.length > 0) {
      await PropertyLead.updateMany(
        { _id: { $in: toClose.map((l) => l._id) } },
        { $set: { status: 'closed', closedAt } }
      );
      // Write one audit entry per affected lead
      await Promise.all(toClose.map((l) =>
        writeAudit({ lid: l._id, actionType: 'STATUS_CHANGED', oldStatus: l.status, newStatus: 'closed', performedBy: req.user.id })
      ));
    }

    const updated = await Property.findByIdAndUpdate(
      req.params.pid,
      { $set: { status: 'inactive' } },
      { new: true }
    );

    res.json({ success: true, closedCount: toClose.length, propertyStatus: updated?.status });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to close leads' });
  }
});

module.exports = router;
