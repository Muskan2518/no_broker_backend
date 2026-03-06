require('dotenv').config();
const mongoose = require('mongoose');
const PropertyAudit = require('./models/PropertyAudit');
const Property = require('./models/Property');

async function queryPropertyAudit() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const audits = await PropertyAudit.find({})
      .populate('pid', 'title')
      .sort({ performedAt: -1 })
      .lean();
    
    console.log(`Found ${audits.length} audit records:\n`);
    console.log('='.repeat(100));
    
    audits.forEach((audit, index) => {
      console.log(`\n[${index + 1}] Audit ID: ${audit._id}`);
      console.log(`Property: ${audit.pid?.title || 'N/A'} (${audit.pid?._id || 'N/A'})`);
      console.log(`Action: ${audit.actionType}`);
      if (audit.fieldName) console.log(`Field: ${audit.fieldName}`);
      if (audit.oldValue) console.log(`Old Value: ${audit.oldValue}`);
      if (audit.newValue) console.log(`New Value: ${audit.newValue}`);
      if (audit.reason) console.log(`Reason: ${audit.reason}`);
      console.log(`Performed By: ${audit.performedBy || 'N/A'}`);
      console.log(`Performed At: ${new Date(audit.performedAt).toLocaleString()}`);
      console.log('-'.repeat(100));
    });

    if (audits.length === 0) {
      console.log('\nNo audit records found.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

queryPropertyAudit();
