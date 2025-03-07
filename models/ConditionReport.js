const mongoose = require('mongoose');

const conditionReportSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conditionBefore: { type: String },
  conditionAfter: { type: String },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ConditionReport', conditionReportSchema);