const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const ConditionReport = require('../models/ConditionReport');
const cloudinary = require('cloudinary').v2;

exports.assignDriver = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') {
      return res.status(403).json({ msg: 'Not a driver' });
    }
    if (!driver.availability) {
      return res.status(400).json({ msg: 'Driver unavailable' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (!booking.needsDriver) return res.status(400).json({ msg: 'Customer does not need a driver' });
    if (booking.driver) return res.status(400).json({ msg: 'Driver already assigned' });
    if (booking.status !== 'confirmed' || !booking.ownerApproved) return res.status(400).json({ msg: 'Booking not confirmed or approved' });

    booking.driver = req.user.id;
    driver.availability = false;
    await booking.save();
    await driver.save();

    res.json({ msg: 'Driver assigned, awaiting customer confirmation', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.completePickupDrop = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') {
      return res.status(403).json({ msg: 'Not a driver' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.driver?.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Booking not found or not yours' });
    }
    if (!booking.driverConfirmed) return res.status(400).json({ msg: 'Driver not confirmed by customer' });

    booking.status = 'completed';
    const vehicle = await Vehicle.findById(booking.vehicle);
    vehicle.availability = true;
    driver.availability = true;
    driver.earnings += 10;
    await booking.save();
    await vehicle.save();
    await driver.save();

    res.json({ msg: 'Pickup/Drop completed', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.reportCondition = async (req, res) => {
  const { bookingId } = req.params;
  const { conditionBefore, conditionAfter } = req.body;

  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') {
      return res.status(403).json({ msg: 'Not a driver' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.driver?.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Booking not found or not yours' });
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        images.push(result.secure_url);
      }
    }

    const report = new ConditionReport({
      booking: bookingId,
      reportedBy: req.user.id,
      conditionBefore,
      conditionAfter,
      images,
    });
    await report.save();

    res.json({ msg: 'Condition reported', report });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') {
      return res.status(403).json({ msg: 'Not a driver' });
    }

    res.json({ msg: 'Earnings retrieved', earnings: driver.earnings });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.rateDriver = async (req, res) => {
  const { bookingId } = req.params;
  const { rating } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (!booking.driver) return res.status(400).json({ msg: 'No driver to rate' });

    const driver = await Driver.findOne({ user: booking.driver });
    driver.averageRating = (driver.averageRating + rating) / 2;
    await driver.save();

    res.json({ msg: 'Driver rated', driver });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getCarLocation = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const driver = await Driver.findOne({ user: req.user.id });
    if (!driver || req.user.role !== 'driver') {
      return res.status(403).json({ msg: 'Not a driver' });
    }

    const booking = await Booking.findById(bookingId).populate('vehicle', 'model');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (booking.driver?.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not assigned to this booking' });
    }

    const location = {
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      vehicleModel: booking.vehicle.model,
    };

    res.json({ msg: 'Car location retrieved', location });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};