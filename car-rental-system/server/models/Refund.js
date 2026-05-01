const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  // The readable ID from your booking (e.g., #SR-7W67F2)
  bookingId: {
    type: String,
    required: true
  },
  
  // The client who received the money
  userEmail: {
    type: String,
    required: true
  },
  
  // The exact amount approved by the admin
  amount: {
    type: Number,
    required: true
  },
  
  // Why the refund was issued (e.g., "Trip Completed Early")
  reason: {
    type: String,
    default: "Early Return"
  },
  
  // Status of the transaction
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  },
  
  // Precise timestamp of the deposit
  processedAt: {
    type: Date,
    default: Date.now
  }
});

// Export the model so bookings.js can use it
module.exports = mongoose.model('Refund', RefundSchema);