const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const ConditionReport = require('../models/ConditionReport');

exports.assignDriver = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });
    if (!driver.availability) return res.status(400).json({ msg: 'Driver unavailable' });

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || !booking.needsDriver || booking.driver || booking.status !== 'confirmed' || !booking.ownerApproved) {
      return res.status(400).json({ msg: 'Booking not eligible' });
    }

    booking.driver = req.user.id;
    driver.availability = false;
    await booking.save();
    await driver.save();

    res.json({ msg: 'Driver assigned', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.confirmDriverAssignment = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.driver?.toString() !== req.user.id || booking.driverConfirmed) {
      return res.status(400).json({ msg: 'Booking not eligible' });
    }

    booking.driverConfirmed = true;
    await booking.save();

    res.json({ msg: 'Driver assignment confirmed', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.completePickupDrop = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.driver?.toString() !== req.user.id || !booking.driverConfirmed) {
      return res.status(400).json({ msg: 'Booking not eligible' });
    }

    booking.status = 'completed';
    const vehicle = await Vehicle.findById(booking.vehicle);
    vehicle.availability = true;
    driver.availability = true;
    driver.earnings += booking.totalPrice * 0.1;
    await booking.save();
    await vehicle.save();
    await driver.save();

    res.json({ msg: 'Pickup/Drop completed', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.reportCondition = async (req, res) => {
  const { conditionBefore, conditionAfter } = req.body;

  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.driver?.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Booking not found or not yours' });
    }

    let images = [];
    if (req.files && req.files.length) {
      images = req.files.map(file => file.path); // Cloudinary URLs
    }

    const report = new ConditionReport({
      booking: req.params.bookingId,
      reportedBy: req.user.id,
      conditionBefore,
      conditionAfter,
      images,
    });
    await report.save();

    res.json({ msg: 'Condition reported', report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const bookings = await Booking.find({ driver: req.user.id, status: 'completed' })
      .populate('vehicle', 'model');
    const earningsBreakdown = bookings.map(booking => ({
      bookingId: booking._id,
      vehicle: booking.vehicle?.model || 'N/A',
      earnings: booking.totalPrice * 0.1,
    }));

    res.json({
      msg: 'Earnings retrieved',
      totalEarnings: driver.earnings,
      earningsBreakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.rateDriver = async (req, res) => {
  const { rating } = req.body;

  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.customer.toString() !== req.user.id || !booking.driver || booking.rating) {
      return res.status(400).json({ msg: 'Booking not eligible' });
    }

    const driver = await Driver.findOne({ user: booking.driver });
    driver.averageRating = driver.averageRating ? (driver.averageRating + rating) / 2 : rating;
    booking.rating = rating;
    await driver.save();
    await booking.save();

    res.json({ msg: 'Driver rated', driver });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getCarLocation = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const booking = await Booking.findById(req.params.bookingId).populate('vehicle', 'model');
    if (!booking || booking.driver?.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not assigned to this booking' });
    }

    const location = {
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      currentLocation: booking.currentLocation || null,
      vehicleModel: booking.vehicle?.model || 'N/A',
    };

    res.json({ msg: 'Car location retrieved', location });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateCarLocation = async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.driver?.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Booking not found or not yours' });
    }

    booking.currentLocation = { latitude, longitude, updatedAt: new Date() };
    await booking.save();

    res.json({ msg: 'Location updated', location: booking.currentLocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getDriverBookings = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const bookings = await Booking.find({ driver: req.user.id })
      .populate('vehicle', 'model')
      .populate('customer', 'name');
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getDriverReviews = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') return res.status(403).json({ msg: 'Not a driver' });

    const bookings = await Booking.find({ driver: req.user.id, status: 'completed' })
      .populate('customer', 'name')
      .select('rating');

    const reviews = bookings.map(booking => ({
      bookingId: booking._id,
      customer: booking.customer.name,
      rating: booking.rating || 'Not rated yet',
    }));

    res.json({
      msg: 'Driver reviews retrieved',
      averageRating: driver.averageRating,
      reviews,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};