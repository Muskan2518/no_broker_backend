const User = require("../models/User");
const nodemailer = require("nodemailer");
const ipRateLimiter = require("../middleware/ipRateLimiter");

require("dotenv").config();

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

const signin = async (req, res) => {
  try {
    const { email } = req.body;

    console.info("Signin request received", { email });

    // Validate required fields
    if (!email) {
      console.warn("Signin validation failed", { email });
      return res.status(400).json({
        success: false,
        error: "Please provide email",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      console.warn("Signin user not found", { email });
      return res.status(401).json({
        success: false,
        error: "Invalid email",
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      console.warn("Signin blocked user", { email, userId: user._id });
      return res.status(403).json({
        success: false,
        error: "Your account has been blocked. Please contact support.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiry (5 minutes)
    otpStore.set(user._id.toString(), {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Send OTP via email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your Sign-In Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Sign-In Verification</h2>
            <p>Hello ${user.name},</p>
            <p>Your verification code is:</p>
            <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <br>
            <p>Best regards,<br>No Broker Team</p>
          </div>
        `,
      });

      console.info("Signin OTP sent", { email, userId: user._id });

      res.status(200).json({
        success: true,
        message: "Verification code sent to your email",
        userId: user._id,
      });
    } catch (emailError) {
      console.error("Signin email error", {
        email,
        userId: user._id,
        message: emailError.message,
      });
      res.status(500).json({
        success: false,
        error: "Failed to send verification email. Please try again.",
      });
    }
  } catch (error) {
    console.error("Signin error", { email: req?.body?.email, message: error.message });
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    // Validate required fields
    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        error: "Please provide userId and OTP",
      });
    }

    // Get stored OTP
    const storedOtpData = otpStore.get(userId);

    if (!storedOtpData) {
      return res.status(401).json({
        success: false,
        error: "OTP expired or invalid. Please sign in again.",
      });
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(userId);
      return res.status(401).json({
        success: false,
        error: "OTP has expired. Please sign in again.",
      });
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      return res.status(401).json({
        success: false,
        error: "Invalid OTP. Please try again.",
      });
    }

    // OTP is valid, delete it
    otpStore.delete(userId);

    // Get user details
    const user = await User.findById(userId).select("-passwordHashed");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Sign JWT with private key (Bearer token)
    const { signJwt } = require('../utils/jwtKeys');
    const token = signJwt({
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });

    res.status(200).json({
      success: true,
      message: "Sign in successful",
      token, // Bearer token
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

module.exports = { signin, verifyOtp };
