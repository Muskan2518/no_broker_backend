const crypto = require('crypto');
const logger = require('./logger');

class CryptoManager {
  constructor() {
    this.privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    this.publicKey = process.env.PUBLIC_KEY.replace(/\\n/g, '\n');
  }

  async encrypt(plaintext) {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: this.publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(plaintext)
      );
      return encrypted.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw error;
    }
  }

  async decrypt(ciphertext) {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(ciphertext, 'base64')
      );
      return decrypted.toString();
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw error;
    }
  }

  async generateDataKey() {
    try {
      const key = crypto.randomBytes(32);
      const encrypted = await this.encrypt(key.toString('base64'));
      return {
        plaintext: key,
        encrypted,
      };
    } catch (error) {
      logger.error('Data Key Generation failed:', error);
      throw error;
    }
  }
}

module.exports = new CryptoManager();
