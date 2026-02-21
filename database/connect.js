const mongoose = require("mongoose");
const logger = require("../config/logger");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error("MongoDB connection failed: MONGO_URI is not set");
    return false;
  }

  try {
    const conn = await mongoose.connect(uri);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    return false;
  }
};

module.exports = connectDB;
 