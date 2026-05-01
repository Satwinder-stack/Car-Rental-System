const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const Booking = require('../models/Booking');
const CompletedBooking = require('../models/Completed_Booking'); 
const User = require('../models/User');

/**
 * 📂 FETCH HISTORY
 * Purpose: Used by the Admin Panel to display the Final Container logs.
 */
router.get('/', async (req, res) => {
    try {
        const history = await CompletedBooking.find().sort({ archivedAt: -1 });
        res.json(history);
    } catch (err) {
        console.error("❌ Error fetching archive:", err);
        res.status(500).json({ error: "Failed to fetch history container." });
    }
});

/**
 * 🔒 SINGLE ARCHIVE LOGIC
 * Moves one specific booking to the Final Container.
 */
router.post('/archive', async (req, res) => {
    const { bookingId, refund } = req.body; 
    
    try {
        // 🚀 THE FIX: Check if bookingId is a valid MongoDB ObjectId or a custom ID string
        const query = mongoose.Types.ObjectId.isValid(bookingId) 
            ? { $or: [{ _id: bookingId }, { id: bookingId }] } 
            : { id: bookingId };

        const activeBooking = await Booking.findOne(query);

        if (!activeBooking) {
            console.warn(`⚠️ Archive attempt failed: ID ${bookingId} not found.`);
            return res.status(404).json({ message: "Booking record missing from active database." });
        }

        const bookingData = activeBooking.toObject();
        const originalId = bookingData._id; // Keep this for deletion later
        delete bookingData._id; 

        // 🛡️ Create Permanent Log
        const archiveEntry = new CompletedBooking({
            ...bookingData,
            status: 'archived_permanent',
            refund: Number(refund) || 0,
            archivedAt: new Date()
        });

        await archiveEntry.save();

        // 🗑️ Remove from Active Collection
        await Booking.deleteOne({ _id: originalId });

        // 💰 Financial Handoff: Refund the user
        const updatedUser = await User.findOneAndUpdate(
            { email: activeBooking.user },
            { $inc: { balance: Number(refund) } },
            { new: true }
        );

        console.log(`✅ [SINGLE_COMMIT]: ${bookingId} moved to Final Container.`);
        res.json({ success: true, updatedUser });

    } catch (err) {
        console.error("❌ ARCHIVE ERROR:", err.message);
        res.status(500).json({ message: "Archive Failed", error: err.message });
    }
});

/**
 * 📦 MASS MIGRATION LOGIC
 * Pushes ALL 'terminated' bookings to the Final Container at once.
 */
router.post('/mass-migrate', async (req, res) => {
    try {
        const toMigrate = await Booking.find({ status: 'terminated' });

        if (toMigrate.length === 0) {
            return res.status(400).json({ message: "No terminated logs ready for migration." });
        }

        const archiveData = toMigrate.map(b => {
            const data = b.toObject();
            delete data._id; 
            return {
                ...data,
                status: 'archived_permanent',
                archivedAt: new Date()
            };
        });

        await CompletedBooking.insertMany(archiveData);
        await Booking.deleteMany({ status: 'terminated' });

        console.log(`📦 [MASTER_SYNC]: ${toMigrate.length} records pushed to Final Container.`);
        res.json({ success: true, count: toMigrate.length });

    } catch (err) {
        console.error("❌ MASS MIGRATE ERROR:", err.message);
        res.status(500).json({ error: "Bulk migration failed." });
    }
});

module.exports = router;