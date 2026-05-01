const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
// 🗑️ REMOVED: Refund model import to stop the table from being created

// --- 1. GET ALL TRANSACTIONS (Live & History) ---
router.get('/', async (req, res) => {
  try {
    // Fetching everything. Angular will use Computed Signals to sort them.
    const bookings = await Booking.find().sort({ requestDate: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error fetching bookings" });
  }
});

// --- 2. CREATE NEW BOOKING ---
// --- 2. CREATE NEW BOOKING (Rewrite in bookings.js) ---
router.post('/', async (req, res) => {
  try {
    const { carId, startDate, endDate, total, user: userEmail } = req.body;
    
    // 1. Availability Check
    const requestedStart = new Date(startDate);
    const requestedEnd = new Date(endDate);
    const BUFFER = 24 * 60 * 60 * 1000;

    const conflict = await Booking.findOne({
      carId: carId,
      status: 'active',
      $or: [
        {
          startDate: { $lt: new Date(requestedEnd.getTime() + BUFFER) },
          endDate: { $gt: new Date(requestedStart.getTime() - BUFFER) }
        }
      ]
    });

    if (conflict) {
      return res.status(400).json({ message: "Unit Unavailable" });
    }

    // 2. Save the Booking
    const newBooking = new Booking({ ...req.body, status: 'active' });
    const savedBooking = await newBooking.save();
    
    // 3. 🚀 THE CRITICAL FIX: Capture the updated user
    // { new: true } is required to get the document AFTER the balance is deducted
    const updatedUser = await User.findOneAndUpdate(
      { email: userEmail }, 
      { $inc: { balance: -total } },
      { new: true } 
    ).select('-password'); // Don't send the password back to the frontend

    // 4. 🚀 THE HANDOFF: Send both to Angular
    res.status(201).json({ 
      booking: savedBooking,
      user: updatedUser // Your Angular code is looking for this specific key!
    });

  } catch (err) {
    console.error("❌ Booking Error:", err.message);
    res.status(400).json({ message: "Failed to save booking" });
  }
});

// --- 3. CUSTOMER: REQUEST EARLY RETURN ---
router.post('/:id/terminate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, returnMethod, pickupAddress, timeSlot, estimatedRefund } = req.body;
    
    const booking = await Booking.findOneAndUpdate(
      { id: id },
      { 
        status: 'pending_termination',
        terminationRequest: {
          reason,
          returnMethod,
          pickupAddress: returnMethod === 'company_pickup' ? pickupAddress : 'N/A',
          timeSlot: returnMethod === 'company_pickup' ? timeSlot : 'N/A',
          requestedAt: new Date(),
          estimatedRefund: estimatedRefund
        }
      },
      { new: true }
    );

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Termination request sent.", booking });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// --- 4. ADMIN: APPROVE TERMINATION & SETTLE REFUND ---
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { refund } = req.body;

    // Search for the custom ID (e.g., SR-SYZNVC)
    const booking = await Booking.findOne({ id: id });
    
    if (!booking) {
      return res.status(404).json({ message: "Booking record missing." });
    }

    // A. Update the existing document status to 'terminated'
    // This automatically moves it to the "History" section in your Angular app
    booking.status = 'terminated';
    await booking.save();

    // B. Credit the user's balance
    const updatedUser = await User.findOneAndUpdate(
      { email: booking.user },
      { $inc: { balance: Number(refund) } },
      { new: true }
    );

    // 💡 No 'new Refund().save()' here, so no extra table is created!

    res.json({ 
      message: "Refund confirmed and processed.", 
      user: updatedUser,
      booking: booking 
    });

  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;