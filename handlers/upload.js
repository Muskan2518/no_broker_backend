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

    // Build the full public URL so the frontend can display the image directly
    // MINIO_ENDPOINT is the S3-style endpoint (e.g. .../storage/v1/s3)
    // Public Supabase URL pattern: .../storage/v1/object/public/<bucket>/<key>
    const endpoint = (process.env.MINIO_ENDPOINT || '').replace(/\/s3\/?$/, '');
    const objectUrl = `${endpoint}/object/public/${bucketName}/${objectName}`;

    res.json({ message: "File uploaded successfully", objectName, objectUrl });
  } catch (err) {
    const logger = require("../config/logger");
    logger.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// GET /api/upload/signed-url — generate a pre-signed S3 PUT URL for direct browser upload
// Query params: fileName (required), contentType (required)
router.get("/upload/signed-url", async (req, res) => {
  try {
    const { fileName, contentType } = req.query;
    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName and contentType are required" });
    }

    const ext = path.extname(fileName) || "";
    const objectName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const params = {
      Bucket: bucketName,
      Key: objectName,
      ContentType: contentType,
      Expires: 300, // 5 minutes
    };

    const signedUrl = await s3.getSignedUrlPromise("putObject", params);

    // Build the public URL the same way the upload endpoint does
    const endpoint = (process.env.MINIO_ENDPOINT || "").replace(/\/s3\/?$/, "");
    const objectUrl = `${endpoint}/object/public/${bucketName}/${objectName}`;

    res.json({ signedUrl, objectName, objectUrl });
  } catch (err) {
    const logger = require("../config/logger");
    logger.error("Signed URL generation error:", err);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

module.exports = router;
