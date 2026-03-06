const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    listingType: {
      type: String,
      enum: ['rent', 'sale'],
      required: true,
      index: true,
    },

    propertyType: {
      type: String,
      enum: ['apartment', 'house', 'villa', 'commercial', 'plot'],
      required: true,
      index: true,
    },

    price: { type: Number, required: true },

    bedrooms:       { type: Number, default: 0 },
    bathrooms:      { type: Number, default: 0 },
    areaSquareFeet: { type: Number },

    furnishing: {
      type: String,
      enum: ['fully_furnished', 'semi_furnished', 'unfurnished', 'not_applicable'],
      default: 'unfurnished',
    },

    address: {
      street:  { type: String, trim: true },
      city:    { type: String, required: true, trim: true, index: true },
      state:   { type: String, trim: true },
      pincode: { type: String, trim: true },
    },

    amenities: [{ type: String }],
    images:    [{ type: String }],

    status: {
      type: String,
      enum: ['active', 'inactive', 'sold', 'rented', 'blocked'],
      default: 'active',
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
