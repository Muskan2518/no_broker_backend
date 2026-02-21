const express = require('express');
const multer = require('multer');
const path = require('path');

const s3 = require('../database/s3setup');

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Temporary local storage


const bucketName = process.env.AWS_BUCKET || 'broker';



  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const objectName = Date.now() + path.extname(file.originalname);
    const fs = require('fs');
    const fileContent = fs.readFileSync(file.path);

    const params = {
      Bucket: bucketName,
      Key: objectName,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    await s3.upload(params).promise();
    // Optionally, delete the file from local uploads/ after upload
    res.json({ message: 'File uploaded', objectName });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
