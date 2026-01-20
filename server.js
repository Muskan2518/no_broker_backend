const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./database/connect");
const sendMail = require("./utils/mailsender");
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


// 📧 Send Email API
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
