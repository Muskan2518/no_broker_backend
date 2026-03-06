require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');

async function debugUserProperties() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('_id name email role').lean();
    console.log('=== USERS ===');
    users.forEach(u => {
      console.log(`ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
    });

    console.log('\n=== PROPERTIES ===');
    const properties = await Property.find({}).select('_id title owner').lean();
    properties.forEach(p => {
      console.log(`Property: ${p.title} | Owner ID: ${p.owner}`);
    });

    console.log('\n=== MATCHING ===');
    for (const user of users) {
      const userProps = await Property.find({ owner: user._id }).lean();
      console.log(`${user.email} (${user._id}) has ${userProps.length} properties`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugUserProperties();
