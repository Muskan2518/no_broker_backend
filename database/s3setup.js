// Sample AWS S3 upload script
const AWS = require("aws-sdk");
const path = require("path");
// AWS S3 setup module
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

module.exports = s3;
