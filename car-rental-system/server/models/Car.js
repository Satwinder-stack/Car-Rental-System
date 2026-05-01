const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  // Unique numeric ID to match your Angular routing (e.g., /car/1)
  id: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  brand: { 
    type: String, 
    required: true 
  },
  model: { 
    type: String, 
    required: true 
  },
  pricePerDay: { 
    type: Number, 
    required: true 
  },
  type: { 
    type: String, 
    required: true // e.g., 'Luxury', 'Exotic'
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  isAvailable: { 
    type: Boolean, 
    default: true 
  },
  transmission: { 
    type: String, 
    default: 'Automatic' 
  },
  fuelType: { 
    type: String, 
    default: 'Electric' 
  },
  engine: { 
    type: String 
  },
  // We explicitly define the object structure for variants 
  // so your booking.ts signals always get the right data.
  variants: [{
    name: String,
    hex: String,
    image: String
  }],
  // Good for sorting "New Arrivals" in the admin panel later
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Car', carSchema);