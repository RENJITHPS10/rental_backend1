const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

exports.getOwnerEarnings = async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ msg: 'Not authorized' });

    const bookings = await Booking.find()
      .populate('vehicle')
      .where('vehicle.owner')
      .equals(req.user.id);

    const payments = await Payment.find({ status: 'completed' }).populate('booking');
    const earnings = payments
      .filter(p => p.booking.vehicle.owner.toString() === req.user.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const earningsDetails = payments
      .filter(p => p.booking.vehicle.owner.toString() === req.user.id)
      .map(p => ({
        bookingId: p.booking._id,
        vehicleModel: p.booking.vehicle.model,
        amount: p.amount,
        date: p.createdAt,
      }));

    res.json({
      msg: 'Earnings retrieved',
      totalEarnings: earnings,
      details: earningsDetails,
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};