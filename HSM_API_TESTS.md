# HSM API Testing

## 1. Test Encryption
```bash
curl -X POST http://localhost:3001/hsm/encrypt \
  -H "Content-Type: application/json" \
  -d "{\"data\": \"My sensitive information\"}"
```

## 2. Test Decryption
```bash
curl -X POST http://localhost:3001/hsm/decrypt \
  -H "Content-Type: application/json" \
  -d "{\"encrypted\": \"YOUR_ENCRYPTED_DATA_HERE\"}"
```

## 3. Test Key Generation
```bash
curl -X POST http://localhost:3001/hsm/generate-key \
  -H "Content-Type: application/json"
```

## 4. Full Test Flow
```bash
# Encrypt
ENCRYPTED=$(curl -s -X POST http://localhost:3001/hsm/encrypt \
  -H "Content-Type: application/json" \
  -d "{\"data\": \"test123\"}" | jq -r '.encrypted')

# Decrypt
curl -X POST http://localhost:3001/hsm/decrypt \
  -H "Content-Type: application/json" \
  -d "{\"encrypted\": \"$ENCRYPTED\"}"
```
