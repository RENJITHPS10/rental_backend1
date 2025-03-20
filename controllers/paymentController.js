const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Driver = require('../models/Driver');
const { calculateDistance } = require('../utils/calculateDistance');

exports.createPayment = async (req, res) => {
  const { paymentMethodId } = req.body; // No need for bookingId in body
  const { bookingId } = req.params; // Use URL param

  console.log('Booking ID:', bookingId, 'Payment Method ID:', paymentMethodId);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: 'vehicle',
        populate: { path: 'owner', select: '_id' },
      })
      .populate('driver') // Populate driver if User ref
      .session(session);

    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({ msg: 'Booking not found' });
    }
    if (booking.customer.toString() !== req.user.id) {
      await session.abortTransaction();
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (booking.status !== 'approved') {
      await session.abortTransaction();
      return res.status(400).json({ msg: 'Booking not approved' });
    }

    let driverFee = 0;
    if (booking.needsDriver && booking.driver) {
      const distance = await calculateDistance(booking.pickupLocation, booking.dropLocation);
      driverFee = distance ? distance * 0.50 : 0;
      booking.driverFee = driverFee;
    }

    const ownerAmount = booking.totalPrice - driverFee;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.totalPrice * 100),
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
    });

    const payment = new Payment({
      booking: bookingId,
      amount: booking.totalPrice,
      method: 'card',
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
      customerId: booking.customer,
      ownerId: booking.vehicle.owner._id,
      driverId: booking.driver ? booking.driver._id : null, // Adjust if driver is User ID
      driverFee,
      ownerAmount,
    });

    await payment.save({ session });

    if (paymentIntent.status === 'succeeded') {
      booking.status = 'completed';
      await booking.save({ session });

      if (booking.needsDriver && booking.driver) {
        await Driver.findOneAndUpdate(
          { user: booking.driver }, // Assuming driver in Booking is User ID
          { $inc: { earnings: driverFee, totalTrips: 1 } },
          { session }
        );
      }
    }

    await session.commitTransaction();
    res.json({
      msg: 'Payment processed',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Payment error:', err.stack);
    if (err instanceof stripe.errors.StripeError) {
      return res.status(400).json({ msg: 'Payment failed', error: err.message });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  } finally {
    session.endSession();
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Only admins can view all payments' });
    }

    const payments = await Payment.find()
      .populate('customerId', 'name email')
      .populate('ownerId', 'name email')
      .populate('driverId', 'name email') // Assumes driverId is User ref
      .populate('booking', 'totalPrice pickupLocation dropLocation');
    res.json(payments);
  } catch (err) {
    console.error('Error in getAllPayments:', err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};