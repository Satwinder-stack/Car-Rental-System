const mongoose = require('mongoose');

const CompletedBookingSchema = new mongoose.Schema({
    carId: { type: String }, 
    userId: { type: String },
    carName: String,
    user: String, 
    startDate: Date,
    endDate: Date,
    total: Number,
    refund: { type: Number, default: 0 },
    status: { type: String, default: 'terminated' },
    archivedAt: { type: Date, default: Date.now },
    terminationRequest: {
        returnMethod: { 
            type: String, 
            // 🚀 ADD 'office_dropoff' HERE or remove 'enum' entirely
            enum: ['standard_return', 'company_pickup', 'change_of_mind', 'office_dropoff', 'trip_completed_early', 'change_of_plans', 'emergency_situation', 'vehicle_technical_issue'], 
            default: 'standard_return' 
        },
        returnMethod: String,
        reason: String,
        estimatedRefund: Number
    }
}, { strict: false }); 

// Forces the collection name to 'completed_bookings' in MongoDB
module.exports = mongoose.model('CompletedBooking', CompletedBookingSchema, 'completed_bookings');