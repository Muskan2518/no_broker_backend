require('dotenv').config();
const { redisGetSet } = require('./database/reddis_setup');

(async () => {
  // Set a value
  const setResult = await redisGetSet('testKey', 'testValue');
  const logger = require('./config/logger');
  logger.info('Set Result:', setResult); // Should print: true

  // Get the value
  const getResult = await redisGetSet('testKey');
  logger.info('Get Result:', getResult); // Should print: testValue

  // Clean up (optional)
  // const client = require('./database/reddis_setup').getRedisClient();
  // await client.del('testKey');
})();
