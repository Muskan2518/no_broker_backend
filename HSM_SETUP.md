# HSM (Hardware Security Module) Setup

## Overview
AWS CloudHSM and KMS integration for secure cryptographic operations including encryption, decryption, and key management.

## Configuration

### 1. Environment Variables
Add to `.env`:
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
HSM_KEY_ID=your_kms_key_id
HSM_CLUSTER_ID=your_hsm_cluster_id (optional)
AWS_REGION=us-east-1
```

### 2. AWS Setup
- Create KMS key in AWS Console
- (Optional) Set up CloudHSM cluster
- Configure IAM permissions for KMS operations

## Usage

### Direct HSM Operations
```javascript
const hsm = require('./config/hsm');

// Encrypt
const encrypted = await hsm.encrypt('sensitive data');

// Decrypt
const decrypted = await hsm.decrypt(encrypted);

// Generate data key
const key = await hsm.generateDataKey();
```

### Middleware Usage
```javascript
const { encryptSensitiveData } = require('./utils/hsmHelper');

router.post('/secure-endpoint', encryptSensitiveData, handler);
```

## API Endpoints

- `POST /hsm/encrypt` - Encrypt data
- `POST /hsm/decrypt` - Decrypt data
- `POST /hsm/generate-key` - Generate encryption key

## Files Created
- `config/hsm.js` - HSM manager
- `utils/hsmHelper.js` - Helper utilities
- `routes/hsm.js` - HSM endpoints
