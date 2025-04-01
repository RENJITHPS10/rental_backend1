const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

exports.getOwnerEarnings = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Fetch payments where the owner matches req.user.id and status is 'completed'
    const payments = await Payment.find({
      ownerId: req.user.id, // Directly filter by ownerId in Payment
      status: 'completed',
    }).populate({
      path: 'booking',
      select: '_id vehicle driverFee',
      populate: {
        path: 'vehicle',
        select: 'model',
      },
    });

    // Map earnings details
    const earningsDetails = payments.map((payment) => ({
      bookingId: payment.booking?._id || 'N/A',
      vehicleModel: payment.booking?.vehicle?.model || 'N/A',
      amount: payment.ownerAmount, // Use ownerAmount directly
      date: payment.createdAt,
    }));

    // Calculate total earnings
    const totalEarnings = earningsDetails.reduce((sum, detail) => sum + detail.amount, 0);
    const completedBookings = earningsDetails.length; // Count completed bookings

    res.json({
      msg: 'Earnings retrieved',
      totalEarnings,
      completedBookings,
      details: earningsDetails,
    });
  } catch (err) {
    console.error('Error in getOwnerEarnings:', err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};