require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// 1. IMPORT YOUR MODELS
const User = require('./models/User'); 

// Middleware
app.use(cors());
app.use(express.json());

// 2. CONNECT TO DATABASE (Cloud or Local Fallback)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/KarlRental';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    // 3. RUN THE ADMIN SEEDER IMMEDIATELY AFTER CONNECTION
    await createAdmin();
  })
  .catch(err => console.error('❌ Connection Error:', err));

// 4. ADMIN SEEDER LOGIC
const createAdmin = async () => {
  try {
    const adminEmail = 'admin@karlrental.com';
    const adminExists = await User.findOne({ email: adminEmail });
    
    if (!adminExists) {
      await User.create({
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
        name: 'System Admin',
        balance: 0,
        phone: '09123456789'
      });
      console.log('👑 Admin user created successfully.');
    }
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  }
};

// 5. ROUTES
const carRoutes = require('./routes/cars');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const completedRoutes = require('./routes/completed_bookings');

app.use('/api/cars', carRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/completed_bookings', completedRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});