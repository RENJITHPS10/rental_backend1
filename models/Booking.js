const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  pickupLocation: { type: String, required: true },
  dropLocation: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  needsDriver: { type: Boolean, default: true },
  driverFee: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'assigned', 'pickup-confirmed', 'completed', 'cancelled'], 
    default: 'pending' 
  }, // Updated statuses
  ownerApproved: { type: Boolean, default: false },
  driverConfirmed: { type: Boolean, default: false }, // Represents pickup readiness
  rating: { type: Number, min: 1, max: 5, default: null },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    updatedAt: Date,
  },
});

module.exports = mongoose.model('Booking', bookingSchema);