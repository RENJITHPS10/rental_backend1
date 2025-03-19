const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const ConditionReport = require('../models/ConditionReport');
const { calculateDistance } = require('../utils/calculateDistance');
const mongoose = require('mongoose');


exports.assignDriver = async (req, res) => {
  const { driverId } = req.body; // Admin provides driverId in request body

  try {
    // Restrict to admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Only admins can assign drivers' });
    }

    // Validate driver
    const driver = await Driver.findOne({ user: driverId });
    if (!driver) {
      return res.status(404).json({ msg: 'Driver not found' });
    }
    if (!driver.availability) {
      return res.status(400).json({ msg: 'Driver is unavailable' });
    }

    // Validate booking
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }
    if (!booking.needsDriver) {
      return res.status(400).json({ msg: 'Booking does not require a driver' });
    }
    if (booking.driver) {
      return res.status(400).json({ msg: 'Driver already assigned to this booking' });
    }
    if (booking.status !== 'approved' || !booking.ownerApproved) {
      return res.status(400).json({ msg: 'Booking not eligible (must be confirmed and owner-approved)' });
    }

    // Assign driver
    booking.driver = driverId;
    driver.availability = false;

    // Save changes
    await booking.save();
    await driver.save();

    res.json({ msg: 'Driver assigned successfully', booking });
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
    if (!booking || booking.driver?.toString() !== req.user.id || booking.driverConfirmed) return res.status(400).json({ msg: 'Booking not eligible' });
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
    if (!booking || booking.driver?.toString() !== req.user.id || !booking.driverConfirmed) return res.status(400).json({ msg: 'Booking not eligible' });
    booking.status = 'completed';
    const vehicle = await Vehicle.findById(booking.vehicle);
    vehicle.availability = true;
    driver.availability = true;
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
    if (!booking || booking.driver?.toString() !== req.user.id) return res.status(404).json({ msg: 'Booking not found or not yours' });
    let images = [];
    if (req.files && req.files.length) images = req.files.map(file => file.path);
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
      earnings: booking.driverFee, // Use driverFee from booking
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
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.getAvailableDrivers = async (req, res) => {
  const { bookingId } = req.query;
  console.log('Booking ID:', bookingId);

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Only admins can view available drivers' });
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ msg: 'Invalid booking ID format' });
    }

    const booking = await Booking.findById(bookingId);
    console.log('Booking:', booking);
    if (!booking || !booking.pickupLocation) {
      return res.status(400).json({ msg: 'Invalid booking or missing pickup location' });
    }

    const drivers = await Driver.find({ availability: true }).populate('user', 'name email');
    console.log('Available Drivers:', drivers);

    const driversWithDistance = await Promise.all(
      drivers.map(async (driver, index) => {
        if (!driver.location) return { ...driver._doc, distance: null };
        await delay(index * 1000); // 1-second delay per request to respect Nominatim limits
        const distance = await calculateDistance(driver.location, booking.pickupLocation);
        console.log(`Distance from ${driver.location} to ${booking.pickupLocation}: ${distance}`);
        return { ...driver._doc, distance };
      })
    );

    driversWithDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    res.json({
      pickupLocation: booking.pickupLocation,
      drivers: driversWithDistance,
    });
  } catch (err) {
    console.error('Error in getAvailableDrivers:', err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
exports.getDriverProfile = async (req, res) => {
 
  try {

    const driver = await Driver.findOne({ user: req.user.id }).populate('user', 'name email');
    console.log(driver)
    if (!driver) {
      return res.status(404).json({ msg: 'Driver profile not found' });
    }
    res.json(driver);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
exports.updateDriver = async (req, res) => {
  const { location, availability } = req.body; // Fields to update
  const driverId = req.params.driverId;

  try {
    // Only allow admin or the driver themselves to update
    const driver = await Driver.findById(driverId).populate('user', 'role');
    if (!driver) {
      return res.status(404).json({ msg: 'Driver not found' });
    }
    if (req.user.role !== 'admin' && req.user.id !== driver.user._id.toString()) {
      return res.status(403).json({ msg: 'Not authorized to update this driver' });
    }

    // Update fields if provided
    if (location !== undefined) driver.location = location;
    if (availability !== undefined) driver.availability = availability;

    await driver.save();

    res.json({ msg: 'Driver updated successfully', driver });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};