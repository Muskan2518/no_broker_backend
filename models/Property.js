const mongoose = require("mongoose");
const crypto = require("crypto");

const propertySchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ptid: { type: mongoose.Schema.Types.ObjectId, ref: "PropertyType", index: true },
    lId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", index: true },

    title: String,
    description: String,

    listingType: {
      type: String,
      enum: ["rent", "sale"],
      required: true,
    },

    price: Number,
    securityDeposit: Number,
    areaSquareFeet: Number,
    bedrooms: Number,
    bathrooms: Number,
    furnishing: String,

    status: {
      type: String,
      enum: ["active", "inactive", "blocked", "sold"],
      default: "active",
      index: true,
    },

    propertyFingerprint: { type: String, index: true },
  },
  { timestamps: true }
);

/* Duplicate detection fingerprint */
propertySchema.pre("save", function (next) {
  const raw = `${this.lId}-${this.bedrooms}-${this.bathrooms}-${this.areaSquareFeet}`;
  this.propertyFingerprint = crypto.createHash("sha256").update(raw).digest("hex");
  next();
});

module.exports = mongoose.model("Property", propertySchema);
