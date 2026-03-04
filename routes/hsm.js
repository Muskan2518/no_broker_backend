const express = require('express');
const router = express.Router();
const hsm = require('../config/hsm');
const { encryptSensitiveData, decryptSensitiveData } = require('../utils/hsmHelper');

router.post('/encrypt', async (req, res) => {
  try {
    const { data } = req.body;
    const encrypted = await hsm.encrypt(data);
    res.json({ encrypted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/decrypt', async (req, res) => {
  try {
    const { encrypted } = req.body;
    const decrypted = await hsm.decrypt(encrypted);
    res.json({ decrypted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-key', async (req, res) => {
  try {
    const key = await hsm.generateDataKey();
    res.json({ key: key.encrypted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
