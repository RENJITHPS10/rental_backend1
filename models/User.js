const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'owner', 'driver', 'admin'], default: 'customer' },
  mobile: { type: String },
  license: { type: String },
  licenseVerified: { type: Boolean, default: false }, // Keep for backward compatibility
  licenseStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  }, // New field for status
  licenseRejectionReason: { type: String }, // New field for rejection reason
  isSuspended: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);