const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHashed: { type: String, required: true },

    role: {
      type: String,
      enum: ["buyer", "seller", "both", "admin"],
      default: "buyer",
      index: true,
    },

    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
