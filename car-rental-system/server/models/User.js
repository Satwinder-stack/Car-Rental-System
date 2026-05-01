const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  balance: { type: Number, default: 1200 },
  phone: { 
    type: String, 
    required: [true, "Phone number is required for contact."],
    match: [/^\d{10,11}$/, "Please enter a valid phone number"] // Validates PH numbers
  }, 
});

module.exports = mongoose.model('User', UserSchema);