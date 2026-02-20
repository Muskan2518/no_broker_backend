const { createClient } = require("redis");

let client;

const connectRedis = async () => {
  if (client) return client;

  client = createClient({
    username: process.env.REDIS_USERNAME || "default",
    password: process.env.REDIS_PASSWORD || "",
    socket: {
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    },
  });

  client.on("error", (err) => console.log("Redis Client Error", err));

  try {
    await client.connect();
    console.log("✅ Redis Connected Successfully");
  } catch (error) {
    console.error("❌ Redis Connection Failed:", error);
  }
  return client;
};

const getRedisClient = () => client;

/**
 * If only key is provided, returns the value for that key.
 * If key and value are provided, sets the value for the key.
 * Usage:
 *   await redisGetSet('foo') // returns value
 *   await redisGetSet('foo', 'bar') // sets value
 */
const redisGetSet = async (key, value) => {
  if (!client) await connectRedis();
  if (value === undefined) {
    // Get value
    try {
      return await client.get(key);
    } catch (err) {
      console.error('Redis GET error:', err);
      return null;
    }
  } else {
    // Set value
    try {
      await client.set(key, value);
      return true;
    } catch (err) {
      console.error('Redis SET error:', err);
      return false;
    }
  }
};

module.exports = { connectRedis, getRedisClient, redisGetSet };

