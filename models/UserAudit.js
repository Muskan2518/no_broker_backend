const mongoose = require("mongoose");

const userAuditSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

  actionType: {
    type: String,
    enum: ["VERIFIED", "UNVERIFIED", "BLOCKED", "UNBLOCKED"],
    required: true,
  },

  previousValue: Boolean,
  newValue: Boolean,
  reason: String,
  performedBy: String,
  performedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UserAudit", userAuditSchema);
