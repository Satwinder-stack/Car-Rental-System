const express = require('express');
const router = express.Router();
const User = require('../models/User');

// REGISTRATION
router.post('/register', async (req, res) => {
  try {
    // 1. Extract 'phone' from the incoming request body
    const { email, password, name, phone } = req.body; 

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already in use." });

    // 2. Include 'phone' when creating the new User object
    const newUser = new User({ 
      email, 
      password, // Note: As your comment says, hash this with bcrypt later!
      name,
      phone // 🚀 THIS IS THE MISSING PIECE
    });

    await newUser.save();
    
    const userResponse = newUser.toObject();
    delete userResponse.password;
    res.status(201).json(userResponse);
  } catch (err) {
    console.error("Registration Error Detail:", err); // 💡 TIP: This will show the real error in your terminal
    res.status(500).json({ message: "Server error during registration." });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  
  if (user) {
    const userResponse = user.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } else {
    res.status(401).json({ message: "Invalid credentials." });
  }
});

module.exports = router;