require('dotenv').config();
const { redisGetSet } = require('./database/reddis_setup');

(async () => {
  // Set a value
  const setResult = await redisGetSet('testKey', 'testValue');
  console.log('Set Result:', setResult); // Should print: true

  // Get the value
  const getResult = await redisGetSet('testKey');
  console.log('Get Result:', getResult); // Should print: testValue

  // Clean up (optional)
  // const client = require('./database/reddis_setup').getRedisClient();
  // await client.del('testKey');
})();
