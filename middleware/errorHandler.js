  const logger = require("../config/logger");

  const errorHandler = (err, req, res, next) => {
    logger.error(`${err.message}`, { stack: err.stack, path: req.path });

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  };

  module.exports = errorHandler;
