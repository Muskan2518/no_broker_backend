require('dotenv').config();
const mongoose = require('mongoose');
const Property = require('./models/Property');
const User = require('./models/User');

async function queryProperties() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const properties = await Property.find({}).populate('owner', 'name email').lean();
    
    console.log(`Found ${properties.length} properties:\n`);
    console.log('='.repeat(100));
    
    properties.forEach((prop, index) => {
      console.log(`\n[${index + 1}] Property ID: ${prop._id}`);
      console.log(`Title: ${prop.title}`);
      console.log(`Type: ${prop.propertyType} | Listing: ${prop.listingType}`);
      console.log(`Price: ₹${prop.price.toLocaleString()}`);
      console.log(`Bedrooms: ${prop.bedrooms} | Bathrooms: ${prop.bathrooms}`);
      console.log(`Area: ${prop.areaSquareFeet || 'N/A'} sqft`);
      console.log(`Furnishing: ${prop.furnishing}`);
      console.log(`Location: ${prop.address.city}${prop.address.state ? ', ' + prop.address.state : ''}`);
      console.log(`Status: ${prop.status}`);
      console.log(`Owner: ${prop.owner?.name || 'N/A'} (${prop.owner?.email || 'N/A'})`);
      console.log(`Amenities: ${prop.amenities.join(', ') || 'None'}`);
      console.log(`Created: ${new Date(prop.createdAt).toLocaleString()}`);
      console.log('-'.repeat(100));
    });

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

queryProperties();
