const express = require("express");
const router = express.Router();
const {
  signup,
  sellerSignup,
  bothSignup,
  adminSignup,
} = require("../handlers/signup");
const { signin, verifyOtp } = require("../handlers/signin");
const sendMail = require("../utils/mailsender");

const requireDbConnection = (req, res, next) => {
  if (!req.app.locals.dbConnected) {
    return res.status(503).json({
      success: false,
      error:
        "Database not connected. Set MONGO_URI and ensure MongoDB is running.",
    });
  }
  next();
};

// Auth routes
router.post("/signup", requireDbConnection, signup);
router.post("/seller_signup", requireDbConnection, sellerSignup);
router.post("/both_signup", requireDbConnection, bothSignup);
router.post("/admin_signup", requireDbConnection, adminSignup);
router.post("/signin", requireDbConnection, signin);
router.post("/verify-otp", requireDbConnection, verifyOtp);

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
