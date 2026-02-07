const mongoose = require("mongoose");

const fraudAuditSchema = new mongoose.Schema({
  fid: { type: mongoose.Schema.Types.ObjectId, ref: "Fraud", index: true },

  actionType: {
    type: String,
    enum: ["CREATED", "STATUS_CHANGED", "REASON_UPDATED", "ASSIGNED", "RESOLVED"],
  },

  oldStatus: String,
  newStatus: String,
  oldReason: String,
  newReason: String,

  remarks: String,
  performedBy: String,
  performedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("FraudAudit", fraudAuditSchema);
