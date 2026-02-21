require("dotenv").config();
const { redisIncrWithExpiry } = require("../config/redis");

const MAX_FREE_TRIES = parseInt(process.env.MAX_FREE_TRIES) || 5;
const WINDOW_SECONDS =
  parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS) || 900; // 15 mins

const ipRateLimiter = async (req, res, next) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const key = `login_attempts:${ip}`;

    const attempts = await redisIncrWithExpiry(
      key,
      WINDOW_SECONDS
    );

    if (attempts > MAX_FREE_TRIES) {
      return res.status(429).json({
        success: false,
        error: "Too many login attempts. Please try again later.",
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    next(); // fail open (don't block if Redis fails)
  }
};

module.exports = ipRateLimiter;