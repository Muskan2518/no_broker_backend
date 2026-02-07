const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: String,
    ipAddress: String,
    deviceInfo: String,
  },
  { timestamps: true }
);

userActivitySchema.index({ uid: 1, createdAt: -1 });

module.exports = mongoose.model("UserActivity", userActivitySchema);
