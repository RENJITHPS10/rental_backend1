const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['car', 'bike'], required: true },
  category: { type: String, required: true },
  model: { type: String, required: true },
  fuelType: { type: String },
  seatingCapacity: { type: Number },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  registration: { type: String, required: true },
  insuranceImage: { type: String },
  images: [{ type: String }],
  availability: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
});

module.exports = mongoose.model('Vehicle', vehicleSchema);