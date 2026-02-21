const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  region: process.env.AWS_REGION || "us-east-1",

  endpoint: process.env.MINIO_ENDPOINT, // 👈 IMPORTANT
  s3ForcePathStyle: true,               // 👈 REQUIRED for MinIO
  signatureVersion: "v4",               // 👈 Recommended
});

module.exports = s3;