const mongoose = require("mongoose");

const sellerProfileSchema = new mongoose.Schema(
  {
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    govtIdTypeName: String,
    govtId: String,

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },

    trustScore: { type: Number, default: 0 },
    govtIdImage: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("SellerProfile", sellerProfileSchema);
