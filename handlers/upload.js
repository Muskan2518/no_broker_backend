const express = require('express');
const multer = require('multer');
const path = require('path');

const minioClient = require('../database/s3setup');

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Temporary local storage


const bucketName = process.env.MINIO_BUCKET || 'broker';

// Ensure bucket exists
async function ensureBucket() {
  const exists = await minioClient.bucketExists(bucketName).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
  }
}

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    await ensureBucket();
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const objectName = Date.now() + path.extname(file.originalname);
    await minioClient.fPutObject(bucketName, objectName, file.path);
    // Optionally, delete the file from local uploads/ after upload
    res.json({ message: 'File uploaded', objectName });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
