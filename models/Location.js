const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    city: String,
    area: String,
    pincode: String,
    latitude: Number,
    longitude: Number,
  },
  { timestamps: true }
);

locationSchema.index({ city: 1, area: 1, pincode: 1 });

module.exports = mongoose.model("Location", locationSchema);
