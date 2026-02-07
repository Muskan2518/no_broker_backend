const mongoose = require("mongoose");

const propertyLeadAuditSchema = new mongoose.Schema({
  lid: { type: mongoose.Schema.Types.ObjectId, ref: "PropertyLead", index: true },

  actionType: {
    type: String,
    enum: ["CREATED", "STATUS_CHANGED", "UPDATED", "DELETED"],
  },

  oldStatus: String,
  newStatus: String,
  reason: String,

  performedBy: String,
  performedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PropertyLeadAudit", propertyLeadAuditSchema);
