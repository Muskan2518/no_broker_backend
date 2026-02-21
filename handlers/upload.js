const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const s3 = require("../database/s3setup");

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const bucketName = process.env.AWS_BUCKET || "broker";

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const objectName = Date.now() + path.extname(file.originalname);
    const fileContent = fs.readFileSync(file.path);

    const params = {
      Bucket: bucketName,
      Key: objectName,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    await s3.upload(params).promise();

    // Clean up temp file after upload
    fs.unlinkSync(file.path);

    res.json({ message: "File uploaded successfully", objectName });
  } catch (err) {
    const logger = require("../config/logger");
    logger.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;
