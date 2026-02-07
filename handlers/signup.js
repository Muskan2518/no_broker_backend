const User = require("../models/User");
const bcrypt = require("bcrypt");

const signup = async (req, res) => {
  try {
    const { name, phoneNumber, email, password, role = "buyer" } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields: name, phoneNumber, email, password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email or phone number already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHashed = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      name,
      phoneNumber,
      email,
      passwordHashed,
      role,
      isVerified: false,
      isBlocked: false,
    });

    // Save user to database
    await newUser.save();

    // Return success response (don't send password)
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

const sellerSignup = async (req, res) => {
  try {
    const { name, phoneNumber, email, password } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields: name, phoneNumber, email, password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email or phone number already exists",
      });
    }

    // Hash passwor
    const saltRounds = 10;
    const passwordHashed = await bcrypt.hash(password, saltRounds);

    // Create new seller user
    const newUser = new User({
      name,
      phoneNumber,
      email,
      passwordHashed,
      role: "seller",
      isVerified: false,
      isBlocked: false,
    });

    // Save user to database
    await newUser.save();

    // Return success response (don't send password)
    res.status(201).json({
      success: true,
      message: "Seller registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Seller signup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

const bothSignup = async (req, res) => {
  try {
    const { name, phoneNumber, email, password } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields: name, phoneNumber, email, password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email or phone number already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHashed = await bcrypt.hash(password, saltRounds);

    // Create new user with both buyer and seller roles
    const newUser = new User({
      name,
      phoneNumber,
      email,
      passwordHashed,
      role: "both",
      isVerified: false,
      isBlocked: false,
    });

    // Save user to database
    await newUser.save();

    // Return success response (don't send password)
    res.status(201).json({
      success: true,
      message: "User registered successfully as buyer and seller",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Both signup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

const adminSignup = async (req, res) => {
  try {
    const { name, phoneNumber, email, password } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide all required fields: name, phoneNumber, email, password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User with this email or phone number already exists",
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHashed = await bcrypt.hash(password, saltRounds);

    // Create new admin user
    const newUser = new User({
      name,
      phoneNumber,
      email,
      passwordHashed,
      role: "admin",
      isVerified: false,
      isBlocked: false,
    });

    // Save user to database
    await newUser.save();

    // Return success response (don't send password)
    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

module.exports = { signup, sellerSignup, bothSignup, adminSignup };
