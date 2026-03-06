const mongoose = require("mongoose");

const propertyLeadSchema = new mongoose.Schema(
  {
    pid: { type: mongoose.Schema.Types.ObjectId, ref: "Property", index: true },
    uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    status: {
      type: String,
      enum: ["new", "contacted", "closed", "rejected"],
      default: "new",
      index: true,
    },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PropertyLead", propertyLeadSchema);
