const User = require("../models/User");
const nodemailer = require("nodemailer");
const ipRateLimiter = require("../middleware/ipRateLimiter");
const { redisSet, redisGet } = require("../database/reddis_setup");

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

    // Store OTP in Redis with 5 minutes expiry
    await redisSet(`otp:${user._id}`, otp, 300);

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

    // Get stored OTP from Redis
    const storedOtp = await redisGet(`otp:${userId}`);

    if (!storedOtp) {
      return res.status(401).json({
        success: false,
        error: "OTP expired or invalid. Please sign in again.",
      });
    }

    // Verify OTP
    if (storedOtp !== otp) {
      return res.status(401).json({
        success: false,
        error: "Invalid OTP. Please try again.",
      });
    }

    // OTP is valid, delete it from Redis
    const { getRedisClient } = require("../database/reddis_setup");
    await getRedisClient().del(`otp:${userId}`);

    // Get user details
    const user = await User.findById(userId).select("-passwordHashed");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Sign JWT with private key (Bearer token)
    const { signJwt, signRefreshToken } = require('../utils/jwtKeys');
    const crypto = require('crypto');
    
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
    
    const accessToken = signJwt(payload);
    const refreshToken = signRefreshToken({ id: user._id, tokenId: crypto.randomBytes(16).toString('hex') });
    
    // Store refresh token in Redis with 7 days expiry
    await redisSet(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60);

    res.status(200).json({
      success: true,
      message: "Sign in successful",
      accessToken,
      refreshToken,
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

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    const { verifyJwt, signJwt, signRefreshToken } = require('../utils/jwtKeys');
    const crypto = require('crypto');
    
    // Verify refresh token
    const decoded = verifyJwt(refreshToken);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
    }

    // Check if refresh token exists in Redis
    const storedToken = await redisGet(`refresh_token:${decoded.id}`);
    if (storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Refresh token expired or invalid",
      });
    }

    // Get user details
    const user = await User.findById(decoded.id).select("-passwordHashed");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Generate new tokens
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
    
    const newAccessToken = signJwt(payload);
    const newRefreshToken = signRefreshToken({ id: user._id, tokenId: crypto.randomBytes(16).toString('hex') });
    
    // Update refresh token in Redis
    await redisSet(`refresh_token:${user._id}`, newRefreshToken, 7 * 24 * 60 * 60);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: "Refresh token is required",
      });
    }

    const { verifyJwt } = require('../utils/jwtKeys');
    const decoded = verifyJwt(refreshToken);
    
    if (decoded && decoded.id) {
      const { getRedisClient } = require("../database/reddis_setup");
      await getRedisClient().del(`refresh_token:${decoded.id}`);
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

module.exports = { signin, verifyOtp, refreshToken, logout };
