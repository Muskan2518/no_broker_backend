const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Generate a new RSA key pair on every server start
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

function signJwt(payload, options = {}) {
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', ...options });
}

function verifyJwt(token) {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (err) {
    return null;
  }
}


// Generate a new keypair and sign a JWT with the new private key
function generateKeypairAndSign(payload, options = {}) {
  const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  const token = jwt.sign(payload, priv, { algorithm: 'RS256', ...options });
  return { token, publicKey: pub, privateKey: priv };
}


// Validate a JWT token and its signature using a provided public key
function validateTokenWithKey(token, pubKey) {
  try {
    return jwt.verify(token, pubKey, { algorithms: ['RS256'] });
  } catch (err) {
    return null;
  }
}

module.exports = { signJwt, verifyJwt, publicKey, generateKeypairAndSign, validateTokenWithKey };
