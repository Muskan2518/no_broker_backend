const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const PropertyAudit = require('../models/PropertyAudit');
const authenticateJwt = require('../utils/authenticateJwt');
const checkBlocked = require('../middleware/checkBlocked');

const SELLER_ROLES = ['seller', 'both', 'admin'];

// ── helper: write audit entry (fire-and-forget — never crashes the route) ──
async function writeAudit({ pid, actionType, fieldName, oldValue, newValue, reason, performedBy }) {
  try {
    await PropertyAudit.create({
      pid,
      actionType,
      fieldName: fieldName || null,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: newValue != null ? String(newValue) : null,
      reason: reason || null,
      performedBy: performedBy ? String(performedBy) : null,
    });
  } catch (auditErr) {
    console.error('[PropertyAudit] write failed:', auditErr.message);
  }
}

// POST /api/properties — create a new property listing
router.post('/', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    if (!SELLER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only sellers can list properties' });
    }

    const {
      title, description, listingType, propertyType, price,
      bedrooms, bathrooms, areaSquareFeet, furnishing,
      address, location, amenities, images,
    } = req.body;

    if (!title || !listingType || !propertyType || !price || !address?.city) {
      return res.status(400).json({ error: 'title, listingType, propertyType, price, and city are required' });
    }

    // Build location sub-doc only when at least one coord is provided
    const locationData = {};
    if (location?.latitude  != null && location.latitude  !== '') locationData.latitude  = Number(location.latitude);
    if (location?.longitude != null && location.longitude !== '') locationData.longitude = Number(location.longitude);

    // Build GeoJSON Point for geo-spatial queries (requires both coords)
    const geoLocationData = (locationData.latitude != null && locationData.longitude != null)
      ? { type: 'Point', coordinates: [locationData.longitude, locationData.latitude] }
      : undefined;

    const property = await Property.create({
      title: title.trim(),
      description: description?.trim(),
      listingType,
      propertyType,
      price: Number(price),
      bedrooms: bedrooms ? Number(bedrooms) : 0,
      bathrooms: bathrooms ? Number(bathrooms) : 0,
      areaSquareFeet: areaSquareFeet ? Number(areaSquareFeet) : undefined,
      furnishing: furnishing || 'unfurnished',
      address,
      ...(Object.keys(locationData).length ? { location: locationData } : {}),
      ...(geoLocationData ? { geoLocation: geoLocationData } : {}),
      amenities: amenities || [],
      images: images || [],
      owner: req.user.id,
    });

    // ── Audit: CREATED ──
    await writeAudit({
      pid: property._id,
      actionType: 'CREATED',
      fieldName: 'status',
      oldValue: null,
      newValue: 'active',
      reason: 'Property listing created',
      performedBy: req.user.id,
    });

    res.status(201).json({ message: 'Property listed successfully', property });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create property' });
  }
});

// GET /api/properties/mine — get current user's own listings
router.get('/mine', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.id })
      .populate('owner', 'name email phoneNumber isVerified')
      .sort({ createdAt: -1 })
      .lean();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json({ properties });
  } catch (err) {
    console.error('Error fetching properties:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch listings' });
  }
});

// GET /api/properties — browse all active listings with filters + pagination
router.get('/', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const {
      listingType, city, propertyType,
      minPrice, maxPrice,
      furnishing,
      minBedrooms, minBathrooms,
      minArea, maxArea,
      sortBy,
      nearLat, nearLng, radius,
      page, limit: limitQ,
    } = req.query;

    const query = { status: 'active' };

    if (listingType && listingType !== 'all') query.listingType = listingType;
    if (propertyType && propertyType !== 'all') query.propertyType = propertyType;
    if (city && city.trim()) query['address.city'] = { $regex: city.trim(), $options: 'i' };
    if (furnishing && furnishing !== 'all') query.furnishing = furnishing;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (minBedrooms && Number(minBedrooms) > 0) query.bedrooms = { $gte: Number(minBedrooms) };
    if (minBathrooms && Number(minBathrooms) > 0) query.bathrooms = { $gte: Number(minBathrooms) };
    if (minArea || maxArea) {
      query.areaSquareFeet = {};
      if (minArea) query.areaSquareFeet.$gte = Number(minArea);
      if (maxArea) query.areaSquareFeet.$lte = Number(maxArea);
    }

    // ── Geo-based filter: properties within radius km of user's location ──
    // Uses $geoWithin + $centerSphere (works with pagination + countDocuments)
    // Earth radius ≈ 6371 km; $centerSphere expects radians = km / 6371
    if (nearLat && nearLng) {
      const radiusKm = Math.min(200, Math.max(0.5, Number(radius) || 10));
      query.geoLocation = {
        $geoWithin: {
          $centerSphere: [
            [Number(nearLng), Number(nearLat)], // GeoJSON: [lng, lat]
            radiusKm / 6371,
          ],
        },
      };
    }

    // Sort
    let sort = { createdAt: -1 };
    if (sortBy === 'price_asc')  sort = { price: 1 };
    else if (sortBy === 'price_desc') sort = { price: -1 };

    // Pagination
    const pageNum  = Math.max(1, parseInt(page)   || 1);
    const pageSize = Math.min(24, parseInt(limitQ) || 12);
    const skip     = (pageNum - 1) * pageSize;

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'name email phoneNumber isVerified')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Property.countDocuments(query),
    ]);

    res.json({ properties, total, page: pageNum, pages: Math.ceil(total / pageSize) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch properties' });
  }
});

// GET /api/properties/:id/audit — fetch audit history for a property (owner or admin)
router.get('/:id/audit', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).lean();
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const isOwner = String(property.owner) === String(req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const audits = await PropertyAudit.find({ pid: req.params.id })
      .sort({ performedAt: -1 })
      .limit(50)
      .lean();

    res.json({ audits });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit history' });
  }
});

// PATCH /api/properties/:id — update listing details (owner or admin)
router.patch('/:id', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, owner: req.user.id };

    const existing = await Property.findOne(query).lean();
    if (!existing) return res.status(404).json({ error: 'Property not found or unauthorized' });

    const { title, description, listingType, propertyType, price,
            bedrooms, bathrooms, areaSquareFeet, furnishing, address, location, amenities, images } = req.body;

    const updates = {};
    const auditEntries = [];

    const track = (field, oldRaw, newRaw, actionType = 'UPDATED') => {
      const oldStr = oldRaw != null ? String(oldRaw) : '';
      const newStr = newRaw != null ? String(newRaw) : '';
      if (oldStr === newStr) return;
      updates[field] = newRaw;
      auditEntries.push({ actionType, fieldName: field, oldValue: oldStr, newValue: newStr });
    };

    if (title       !== undefined) track('title',          existing.title,          title.trim());
    if (description !== undefined) track('description',    existing.description,    description.trim());
    if (listingType !== undefined) track('listingType',    existing.listingType,    listingType);
    if (propertyType!== undefined) track('propertyType',   existing.propertyType,   propertyType);
    if (furnishing  !== undefined) track('furnishing',     existing.furnishing,     furnishing);
    if (bedrooms    !== undefined) track('bedrooms',       existing.bedrooms,       Number(bedrooms));
    if (bathrooms   !== undefined) track('bathrooms',      existing.bathrooms,      Number(bathrooms));
    if (areaSquareFeet !== undefined)
      track('areaSquareFeet', existing.areaSquareFeet, Number(areaSquareFeet));
    if (price !== undefined)
      track('price', existing.price, Number(price), 'PRICE_CHANGED');

    if (address !== undefined) {
      const oldAddr = `${existing.address?.city}|${existing.address?.state}|${existing.address?.pincode}|${existing.address?.street}`;
      const newAddr = `${address.city}|${address.state}|${address.pincode}|${address.street}`;
      if (oldAddr !== newAddr) {
        updates.address = address;
        auditEntries.push({ actionType: 'UPDATED', fieldName: 'address',
          oldValue: oldAddr, newValue: newAddr });
      }
    }

    if (location !== undefined) {
      const oldLat  = existing.location?.latitude  != null ? String(existing.location.latitude)  : '';
      const oldLng  = existing.location?.longitude != null ? String(existing.location.longitude) : '';
      const newLat  = location.latitude  != null && location.latitude  !== '' ? String(Number(location.latitude))  : '';
      const newLng  = location.longitude != null && location.longitude !== '' ? String(Number(location.longitude)) : '';
      if (oldLat !== newLat || oldLng !== newLng) {
        const locData = {};
        if (newLat !== '') locData.latitude  = Number(newLat);
        if (newLng !== '') locData.longitude = Number(newLng);
        updates.location = locData;
        // Keep GeoJSON geoLocation in sync so geo queries stay accurate
        if (locData.latitude != null && locData.longitude != null) {
          updates.geoLocation = { type: 'Point', coordinates: [locData.longitude, locData.latitude] };
        } else {
          updates.geoLocation = undefined; // clear if coords removed
        }
        auditEntries.push({ actionType: 'UPDATED', fieldName: 'location',
          oldValue: oldLat && oldLng ? `${oldLat},${oldLng}` : '',
          newValue: newLat && newLng ? `${newLat},${newLng}` : '' });
      }
    }

    if (amenities !== undefined) {
      const oldA = (existing.amenities || []).slice().sort().join(',');
      const newA = (amenities || []).slice().sort().join(',');
      if (oldA !== newA) {
        updates.amenities = amenities;
        auditEntries.push({ actionType: 'UPDATED', fieldName: 'amenities',
          oldValue: oldA, newValue: newA });
      }
    }

    if (images !== undefined) {
      const oldCount = (existing.images || []).length;
      const newCount = (images || []).length;
      updates.images = images;
      if (oldCount !== newCount) {
        auditEntries.push({ actionType: 'UPDATED', fieldName: 'images',
          oldValue: `${oldCount} photo(s)`, newValue: `${newCount} photo(s)` });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ message: 'No changes detected', property: existing });
    }

    const property = await Property.findOneAndUpdate(query, { $set: updates }, { new: true })
      .populate('owner', 'name email phoneNumber isVerified');

    // Write one audit entry per changed field
    for (const entry of auditEntries) {
      await writeAudit({
        pid: property._id,
        actionType: entry.actionType,
        fieldName: entry.fieldName,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        performedBy: req.user.id,
      });
    }

    res.json({ message: 'Property updated', property });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update property' });
  }
});

// PATCH /api/properties/:id/status — update listing status (owner or admin)
router.patch('/:id/status', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['active', 'inactive', 'sold', 'rented', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, owner: req.user.id };

    // Capture old status before updating
    const existing = await Property.findOne(query).select('status').lean();
    if (!existing) return res.status(404).json({ error: 'Property not found or unauthorized' });

    const fromStatus = existing.status;

    const property = await Property.findOneAndUpdate(query, { status }, { new: true });
    if (!property) return res.status(404).json({ error: 'Property not found or unauthorized' });

    // ── Audit: STATUS_CHANGED ──
    await writeAudit({
      pid: property._id,
      actionType: 'STATUS_CHANGED',
      fieldName: 'status',
      oldValue: fromStatus,
      newValue: status,
      reason: reason || null,
      performedBy: req.user.id,
    });

    res.json({ message: 'Status updated', property });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
});

// DELETE /api/properties/:id — delete listing (owner or admin)
router.delete('/:id', authenticateJwt, checkBlocked, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, owner: req.user.id };

    const property = await Property.findOneAndDelete(query);
    if (!property) return res.status(404).json({ error: 'Property not found or unauthorized' });

    // ── Audit: DELETED ──
    await writeAudit({
      pid: property._id,
      actionType: 'DELETED',
      fieldName: 'status',
      oldValue: property.status,
      newValue: null,
      reason: 'Property listing deleted',
      performedBy: req.user.id,
    });

    res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete property' });
  }
});

module.exports = router;
