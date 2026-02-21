const winston = require("winston");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "auth-service" },
  transports: [
    // All logs
    new winston.transports.File({
      filename: "logs/combined.log",
    }),

    // Only errors
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
  ],
});

// Console logging in development
if (!isProduction) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;