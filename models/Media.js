const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    pid: { type: mongoose.Schema.Types.ObjectId, ref: "Property", index: true },
    s3Link: String,
    isPrimaryImg: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Media", mediaSchema);
