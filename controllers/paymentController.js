const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

exports.createPayment = async (req, res) => {
  const { bookingId, paymentMethodId } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.totalPrice * 100,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: 'http://localhost:3000/payment-success',
    });

    const payment = new Payment({
      booking: bookingId,
      amount: booking.totalPrice,
      method: 'card',
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'pending',
    });
    await payment.save();

    if (paymentIntent.status === 'succeeded') {
      booking.status = 'confirmed';
      await booking.save();
    }

    res.json({
      msg: 'Payment processed',
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });
  } catch (err) {
    res.status(500).json({ msg: 'Payment error', error: err.message });
  }
};