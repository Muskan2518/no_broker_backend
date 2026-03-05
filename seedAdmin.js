const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@broker.com' });
    
    if (existingAdmin) {
      console.log('Admin account already exists');
      process.exit(0);
    }

    const passwordHashed = await bcrypt.hash('admin123', 10);

    const admin = new User({
      name: 'Admin',
      phoneNumber: '9999999999',
      email: 'admin@broker.com',
      passwordHashed,
      role: 'admin',
      isVerified: true,
      isBlocked: false,
    });

    await admin.save();
    console.log('Admin account created successfully');
    console.log('Email: admin@broker.com');
    console.log('Password: admin123');
    console.log('OTP: Any random number will work');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
