const mongoose = require("mongoose");

const propertyAuditSchema = new mongoose.Schema({
  pid: { type: mongoose.Schema.Types.ObjectId, ref: "Property", index: true },

  actionType: {
    type: String,
    enum: ["CREATED", "UPDATED", "PRICE_CHANGED", "STATUS_CHANGED", "DELETED"],
  },

  fieldName: String,
  oldValue: String,
  newValue: String,

  reason: String,
  performedBy: String,
  performedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PropertyAudit", propertyAuditSchema);
