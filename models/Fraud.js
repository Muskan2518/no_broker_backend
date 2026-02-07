const mongoose = require("mongoose");

const fraudSchema = new mongoose.Schema(
  {
    pid: { type: mongoose.Schema.Types.ObjectId, ref: "Property", index: true },
    uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    reason: String,

    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "false_positive"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Fraud", fraudSchema);
