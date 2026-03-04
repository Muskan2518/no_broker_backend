const crypto = require('../config/hsm');
const logger = require('../config/logger');

const encryptSensitiveData = async (req, res, next) => {
  if (req.body && req.body.sensitiveData) {
    try {
      req.body.encryptedData = await crypto.encrypt(JSON.stringify(req.body.sensitiveData));
      delete req.body.sensitiveData;
    } catch (error) {
      logger.error('Failed to encrypt sensitive data:', error);
      return res.status(500).json({ error: 'Encryption failed' });
    }
  }
  next();
};

const decryptSensitiveData = async (encryptedData) => {
  try {
    const decrypted = await crypto.decrypt(encryptedData);
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error('Failed to decrypt data:', error);
    throw error;
  }
};

module.exports = { encryptSensitiveData, decryptSensitiveData };
