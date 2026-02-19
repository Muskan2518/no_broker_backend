const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./database/connect");
const sendMail = require("./utils/mailsender");
const { signup, sellerSignup, bothSignup, adminSignup } = require("./handlers/signup");
const { signin, verifyOtp } = require("./handlers/signin");
const app = express();

let dbConnected = false;

mongoose.connection.on("connected", () => {
  dbConnected = true;
});

mongoose.connection.on("disconnected", () => {
  dbConnected = false;
});

mongoose.connection.on("error", () => {
  dbConnected = false;
});

// Connect MongoDB (do not block server start if it fails)
connectDB().then((connected) => {
  dbConnected = connected;
});

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// Handle CORS preflight for all routes
app.options(/.*/, cors());

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "No Broker API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get(["/health", "/healthz"], (req, res) => {
  res.status(200).json({
    status: "UP healthy",
    db: dbConnected ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
});

const requireDbConnection = (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      error: "Database not connected. Set MONGO_URI and ensure MongoDB is running.",
    });
  }
  next();
};

// 👤 User Signup API
app.post("/signup", requireDbConnection, signup);
app.post("/seller_signup", requireDbConnection, sellerSignup);
app.post("/both_signup", requireDbConnection, bothSignup);
app.post("/admin_signup", requireDbConnection, adminSignup);

// � User Signin API
app.post("/signin", requireDbConnection, signin);
app.post("/verify-otp", requireDbConnection, verifyOtp);

// �📧 Send Email API
app.post("/send-email", async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to) {
    return res.status(400).json({ error: "Receiver email is required" });
  }

  try {
    await sendMail(to, subject, message);
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
