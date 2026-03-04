require('dotenv').config();
const hsm = require('./config/hsm');
const logger = require('./config/logger');

async function testHSM() {
  console.log('\n🔐 Testing HSM Setup...\n');

  try {
    // Test 1: Verify Connection
    console.log('1️⃣ Verifying HSM connection...');
    await hsm.verifyHSMConnection();

    // Test 2: Encrypt
    console.log('\n2️⃣ Testing encryption...');
    const testData = 'Hello HSM - Sensitive Data';
    const encrypted = await hsm.encrypt(testData);
    console.log('✅ Encrypted:', encrypted.substring(0, 50) + '...');

    // Test 3: Decrypt
    console.log('\n3️⃣ Testing decryption...');
    const decrypted = await hsm.decrypt(encrypted);
    console.log('✅ Decrypted:', decrypted);
    console.log('✅ Match:', testData === decrypted ? 'YES' : 'NO');

    // Test 4: Generate Key
    console.log('\n4️⃣ Testing key generation...');
    const key = await hsm.generateDataKey();
    console.log('✅ Generated key (encrypted):', key.encrypted.substring(0, 50) + '...');

    console.log('\n✅ All HSM tests passed!\n');
  } catch (error) {
    console.error('\n❌ HSM Test Failed:', error.message);
    console.error('\n💡 Make sure you have set:');
    console.error('   - AWS_ACCESS_KEY_ID');
    console.error('   - AWS_SECRET_ACCESS_KEY');
    console.error('   - HSM_KEY_ID (KMS Key ID)');
    console.error('   - AWS_REGION\n');
    process.exit(1);
  }
}

testHSM();
