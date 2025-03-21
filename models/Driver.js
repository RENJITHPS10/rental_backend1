const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  availability: { type: Boolean, default: true },
  earnings: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalTrips: { type: Number, default: 0 },
  location: { type: String }
});

module.exports = mongoose.model('Driver', driverSchema);