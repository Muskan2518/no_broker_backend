const User = require("../models/User");
const bcrypt = require("bcrypt");

const createSignupHandler = ({ role, successMessage }) => async (req, res) => {
  try {
    const { name, phoneNumber, email, password } = req.body;

    console.info("Signup request received", {
      role,
      email,
      phoneNumber,
    });

    // Validate required fields
    if (!name || !phoneNumber || !email || !password) {
      console.warn("Signup validation failed", { role, email, phoneNumber });
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
      console.warn("Signup conflict", { role, email, phoneNumber });
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

    console.info("Signup success", {
      role,
      userId: newUser._id,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
    });

    // Return success response (don't send password)
    res.status(201).json({
      success: true,
      message: successMessage,
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
    console.error("Signup error", { role, message: error.message });
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};

const signup = createSignupHandler({
  role: "buyer",
  successMessage: "User registered successfully",
});

const sellerSignup = createSignupHandler({
  role: "seller",
  successMessage: "Seller registered successfully",
});

const bothSignup = createSignupHandler({
  role: "both",
  successMessage: "User registered successfully as buyer and seller",
});

const adminSignup = createSignupHandler({
  role: "admin",
  successMessage: "Admin registered successfully",
});

module.exports = { signup, sellerSignup, bothSignup, adminSignup, createSignupHandler };
