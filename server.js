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

app.locals.dbConnected = false;
mongoose.connection.on("connected", () => {
  app.locals.dbConnected = true;
});
mongoose.connection.on("disconnected", () => {
  app.locals.dbConnected = false;
});
mongoose.connection.on("error", () => {
  app.locals.dbConnected = false;
});

connectDB().then((connected) => {
  app.locals.dbConnected = connected;
});
connectRedis();

s3.listBuckets((err, data) => {
  if (err) console.error("❌ S3 Connection Failed:", err.message || err);
  else
    console.log(
      "✅ S3 Connected. Buckets:",
      data.Buckets.map((b) => b.Name).join(", ") || "none",
    );
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options(/.*/, cors());
app.use(express.json());

app.get("/", (req, res) =>
  res
    .status(200)
    .json({
      status: "OK",
      message: "No Broker API is running",
      timestamp: new Date().toISOString(),
    }),
);
app.get(["/health", "/healthz"], (req, res) =>
  res
    .status(200)
    .json({
      status: "UP healthy",
      db: app.locals.dbConnected ? "CONNECTED" : "DISCONNECTED",
      timestamp: new Date().toISOString(),
    }),
);

app.use("/api", uploadHandler);
app.use("/", routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
