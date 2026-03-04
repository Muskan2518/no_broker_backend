const logger = require("../config/logger");
const { redisIncrWithExpiry } = require("../database/reddis_setup");

const rateLimiter = (options = {}) => {
  const {
    windowSeconds = 900,
    maxRequests = 100,
    keyPrefix = "rate_limit",
    message = "Too many requests. Please try again later.",
  } = options;

  return async (req, res, next) => {
    try {
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
      const key = `${keyPrefix}:${ip}`;

      const count = await redisIncrWithExpiry(key, windowSeconds);

      if (count > maxRequests) {
        return res.status(429).json({
          success: false,
          error: message,
        });
      }

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));

      next();
    } catch (error) {
      logger.error("Rate limiter error:", error);
      next();
    }
  };
};

module.exports = rateLimiter;
