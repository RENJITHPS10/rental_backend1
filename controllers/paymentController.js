const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Driver = require('../models/Driver');
const { calculateDistance } = require('../utils/calculateDistance');



exports.createPayment = async (req, res) => {
  const { bookingId, paymentMethodId } = req.body;

  try {
    const booking = await Booking.findById(bookingId).populate({
      path: 'vehicle',
      populate: { path: 'owner', select: '_id' }, // Only need owner ID
    }).populate('driver');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ msg: 'Booking not confirmed' });
    }

    // Calculate driver fee (distance-based)
    let driverFee = 0;
    if (booking.needsDriver && booking.driver) {
      const distance = await calculateDistance(booking.pickupLocation, booking.dropLocation);
      driverFee = distance * 0.50; // $0.50 per km
      booking.driverFee = driverFee;
    }

    const ownerAmount = booking.totalPrice - driverFee;

    // Create Payment Intent (all money goes to platform/admin account)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.totalPrice * 100, // Total in cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: 'http://localhost:3000/payment-success',
      // No transfer_data; funds stay in platform account
    });

    // Save payment details
    const payment = new Payment({
      booking: bookingId,
      amount: booking.totalPrice,
      method: 'card',
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      customerId: booking.customer,
      ownerId: booking.vehicle.owner._id,
      driverId: booking.driver ? booking.driver._id : null,
      driverFee,
      ownerAmount,
    });
    await payment.save();

    if (paymentIntent.status === 'succeeded') {
      booking.status = 'completed';
      await booking.save();

      if (booking.needsDriver && booking.driver) {
        await Driver.findOneAndUpdate(
          { user: booking.driver },
          { $inc: { earnings: driverFee, totalTrips: 1 } }
        );
      }
    }

    res.json({
      msg: 'Payment processed',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Payment error', error: err.message });
  }
};

// Optional: Endpoint for admin to view all payments
exports.getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Only admins can view all payments' });
    }

    const payments = await Payment.find()
      .populate('customerId', 'name email')
      .populate('ownerId', 'name email')
      .populate('driverId', 'name email')
      .populate('booking', 'totalPrice pickupLocation dropLocation');
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

