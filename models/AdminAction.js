const mongoose = require("mongoose");

const adminActionSchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: String,
    targetType: String,
    targetId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminAction", adminActionSchema);
