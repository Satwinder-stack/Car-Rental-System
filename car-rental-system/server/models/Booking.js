const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  
  // 🛠️ FIX 1: Change to String. 
  // If your frontend sends a simple string ID, ObjectId will cause a 400 error.
  userId: { type: String, required: true }, 

  carId: { type: Number, required: true },
  carName: { type: String, required: true },
  user: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  total: { type: Number, required: true },

  // 🛠️ FIX 2: Explicitly add these fields. 
  // Your Angular 'details' object spreads these into the request.
  service: { type: String, default: 'pickup' },
  address: { type: String, default: 'N/A' },
  color: { type: String, default: 'Standard' },

  status: { 
    type: String, 
    enum: ['active', 'pending_termination', 'terminated', 'completed'], 
    default: 'active' 
  },

  terminationRequest: {
    returnMethod: { 
        type: String, 
        // 🚀 ADD 'office_dropoff' HERE or remove 'enum' entirely
        enum: ['standard_return', 'company_pickup', 'change_of_mind', 'office_dropoff', 'trip_completed_early', 'change_of_plans', 'emergency_situation', 'vehicle_technical_issue'], 
        default: 'standard_return' 
    },
    reason: String,
    pickupAddress: String,
    timeSlot: String,
    estimatedRefund: Number,
    requestDate: { type: Date, default: Date.now }
  },
  
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', BookingSchema);