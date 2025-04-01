const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, only if needsDriver is true
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  pickupLocation: { type: String, required: true },
  dropLocation: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  needsDriver: { type: Boolean, default: true },
  driverFee: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'assigned', 'pickup-confirmed', 'delivered', 'completed', 'cancelled','paid'], 
    default: 'pending' 
  }, // Added 'delivered' to reflect trip completion before final completion
  ownerApproved: { type: Boolean, default: false }, // Owner approves booking
  driverConfirmed: { type: Boolean, default: false }, // Driver confirms pickup readiness
  conditionReports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ConditionReport' }], // Added to store condition reports
  rating: { type: Number, min: 1, max: 5, default: null }, // Customer rating post-trip
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    updatedAt: { type: Date },
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Booking', bookingSchema);