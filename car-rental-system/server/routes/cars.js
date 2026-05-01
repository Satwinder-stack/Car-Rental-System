const express = require('express');
const router = express.Router();
const Car = require('../models/Car');

// 1. GET all cars (For car-list and admin-panel)
router.get('/', async (req, res) => {
  try {
    const cars = await Car.find();
    res.json(cars);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cars." });
  }
});

// 2. PATCH update car availability (For Admin Panel toggle)
router.patch('/:id', async (req, res) => {
  try {
    const { isAvailable } = req.body;
    // We use { id: req.params.id } because we are using your custom numeric ID
    const updatedCar = await Car.findOneAndUpdate(
      { id: req.params.id }, 
      { isAvailable }, 
      { new: true }
    );
    
    if (!updatedCar) return res.status(404).json({ message: "Car not found" });
    res.json(updatedCar);
  } catch (err) {
    res.status(500).json({ message: "Error updating car status." });
  }
});

module.exports = router;