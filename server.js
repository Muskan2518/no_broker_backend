const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./database/connect");

const app = express();

// Connect MongoDB
connectDB();

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP helathy",
    db: "CONNECTED",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
