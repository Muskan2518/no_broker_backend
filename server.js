const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./database/connect");
const { connectRedis } = require("./database/reddis_setup");
const uploadHandler = require("./handlers/upload");
const s3 = require("./database/s3setup");
const routes = require("./routes/index");

const app = express();

/* ---------------- DB CONNECTION HANDLING ---------------- */

// Crash if Mongo disconnects at runtime
mongoose.connection.on("disconnected", () => {
  console.error("❌ MongoDB disconnected. Shutting down...");
  process.exit(1);
});

// Crash on connection error
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err);
  process.exit(1);
});

/* ---------------- START SERVER ONLY AFTER DB CONNECTS ---------------- */

async function startServer() {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    await connectRedis();
    console.log("✅ Redis Connected");

    s3.listBuckets((err, data) => {
      if (err) console.error("❌ S3 Connection Failed:", err.message || err);
      else
        console.log(
          "✅ S3 Connected. Buckets:",
          data.Buckets.map((b) => b.Name).join(", ") || "none",
        );
    });

    /* ---------------- MIDDLEWARE ---------------- */

    app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    );

    app.use(express.json());

    /* ---------------- ROUTES ---------------- */

    app.get("/", (req, res) =>
      res.status(200).json({
        status: "OK",
        message: "No Broker API is running",
        timestamp: new Date().toISOString(),
      }),
    );

    app.get(["/health", "/healthz"], (req, res) =>
      res.status(200).json({
        status: "UP healthy",
        db: "CONNECTED",
        timestamp: new Date().toISOString(),
      }),
    );

    app.use("/api", uploadHandler);
    app.use("/", routes);

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`),
    );
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1); // Crash if DB connection fails at startup
  }
}

startServer();

/* ---------------- GRACEFUL SHUTDOWN ---------------- */

process.on("SIGINT", async () => {
  console.log("🛑 Gracefully shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});
