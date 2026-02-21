const express = require("express");
const router = express.Router();
const ipRateLimiter = require("../middleware/ipRateLimiter");

const {
  signup,
  sellerSignup,
  bothSignup,
  adminSignup,
} = require("../handlers/signup");
const { signin, verifyOtp } = require("../handlers/signin");
const sendMail = require("../utils/mailsender");

// Auth routes
router.post("/signup", signup);
router.post("/seller_signup", sellerSignup);
router.post("/both_signup", bothSignup);
router.post("/admin_signup", adminSignup);
router.post("/signin",ipRateLimiter, signin);
router.post("/verify-otp", verifyOtp);

// Email route
router.post("/send-email", async (req, res) => {
  const { to, subject, message } = req.body;
  if (!to) return res.status(400).json({ error: "Receiver email is required" });
  try {
    await sendMail(to, subject, message);
    res.status(200).json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
