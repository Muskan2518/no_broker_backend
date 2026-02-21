const { createClient } = require("redis");
require("dotenv").config();

let client;

const connectRedis = async () => {
  if (client) return client;

  client = createClient({
    username: process.env.REDIS_USERNAME || "default",
    password: process.env.REDIS_PASSWORD || "",
    socket: {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT
        ? parseInt(process.env.REDIS_PORT, 10)
        : 6379,
    },
  });

  const logger = require("../config/logger");
  client.on("error", (err) =>
    logger.error("❌ Redis Client Error:", err)
  );

  try {
    await client.connect();
    logger.info("✅ Redis Connected Successfully");
  } catch (error) {
    logger.error("❌ Redis Connection Failed:", error);
  }

  return client;
};

const getRedisClient = () => client;

/**
 * Get value
 */
const redisGet = async (key) => {
  if (!client) await connectRedis();
  try {
    return await client.get(key);
  } catch (err) {
    logger.error("Redis GET error:", err);
    return null;
  }
};

/**
 * Set value with optional expiry (seconds)
 */
const redisSet = async (key, value, expirySeconds = null) => {
  if (!client) await connectRedis();
  try {
    if (expirySeconds) {
      await client.set(key, value, {
        EX: expirySeconds,
      });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    logger.error("Redis SET error:", err);
    return false;
  }
};

/**
 * Increment key with expiry (Atomic for rate limiting)
 * Returns updated count
 */
const redisIncrWithExpiry = async (key, expirySeconds) => {
  if (!client) await connectRedis();

  try {
    const count = await client.incr(key);

    // Set expiry only if first increment
    if (count === 1) {
      await client.expire(key, expirySeconds);
    }

    return count;
  } catch (err) {
    logger.error("Redis INCR error:", err);
    return null;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  redisGet,
  redisSet,
  redisIncrWithExpiry,
};