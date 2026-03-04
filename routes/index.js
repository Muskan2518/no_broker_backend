const express = require("express");
const router = express.Router();
const ipRateLimiter = require("../middleware/ipRateLimiter");

const {
  signup,
  sellerSignup,
  bothSignup,
  adminSignup,
} = require("../handlers/signup");
const { signin, verifyOtp, refreshToken, logout } = require("../handlers/signin");
const sendMail = require("../utils/mailsender");
const hsmRoutes = require("./hsm");

// Auth routes
router.post("/signup", signup);
router.post("/seller_signup", sellerSignup);
router.post("/both_signup", bothSignup);
router.post("/admin_signup", adminSignup);
router.post("/signin",ipRateLimiter, signin);
router.post("/verify-otp", verifyOtp);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

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

// HSM routes
router.use("/hsm", hsmRoutes);

module.exports = router;
