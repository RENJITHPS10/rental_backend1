const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const ConditionReport = require('../models/ConditionReport');

exports.createBooking = async (req, res) => {
  const { vehicleId, startDate, endDate, dropLocation, needsDriver } = req.body;

  try {
    // Fetch the vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || !vehicle.availability || !vehicle.isApproved) {
      return res.status(400).json({ msg: 'Vehicle not available or not approved' });
    }

    // Use vehicle's current location as pickup location
    const pickupLocation = vehicle.location; // Assuming vehicle has a 'location' field
    if (!pickupLocation) {
      return res.status(400).json({ msg: 'Vehicle location not set' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ msg: 'End date must be after start date' });
    }

    // Calculate total price
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = vehicle.price * days;

    // Create booking
    const booking = new Booking({
      customer: req.user.id,
      vehicle: vehicleId,
      startDate,
      endDate,
      pickupLocation, // Set from vehicle.location
      dropLocation: dropLocation || pickupLocation, // Default to pickup if not provided
      totalPrice,
      needsDriver: needsDriver !== undefined ? needsDriver : false, // Default to false
    });

    // Update vehicle availability
    vehicle.availability = false;
    await vehicle.save();
    await booking.save();

    res.json({ msg: 'Booking created', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};



exports.getBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'customer') {
      bookings = await Booking.find({ customer: req.user.id });
    } else if (req.user.role === 'owner') {
      // Find bookings and populate vehicle
      bookings = await Booking.find({
        status: 'pending',           // Only pending bookings
        ownerApproved: false         // Not yet approved by owner
      })
        .populate({
          path: 'vehicle',
          match: { owner: req.user.id }, // Filter vehicles by owner
          select: 'model type category owner' // Include owner for debugging
        })
        .lean(); // Convert to plain JS objects for easier filtering

      // Filter out bookings where vehicle didn't match (null after populate)
      bookings = bookings.filter(booking => booking.vehicle !== null);

    } else if (req.user.role === 'driver') {
      bookings = await Booking.find({ driver: req.user.id });
    } else {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Additional population for customer and driver
    bookings = await Booking.populate(bookings, [
      { path: 'customer', select: 'name' },
      { path: 'driver', select: 'name' },
    ]);

    console.log('Final bookings:', bookings); // Debug log
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (booking.status === 'cancelled') return res.status(400).json({ msg: 'Booking already cancelled' });

    booking.status = 'cancelled';
    const vehicle = await Vehicle.findById(booking.vehicle);
    vehicle.availability = true;
    await vehicle.save();
    await booking.save();

    res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.confirmDriver = async (req, res) => {
  const { confirm } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (!booking.driver) return res.status(400).json({ msg: 'No driver assigned' });
    if (booking.driverConfirmed) return res.status(400).json({ msg: 'Driver already confirmed' });

    if (confirm) {
      booking.driverConfirmed = true;
    } else {
      const driver = await Driver.findOne({ user: booking.driver });
      driver.availability = true;
      booking.driver = null;
      await driver.save();
    }
    await booking.save();

    res.json({ msg: confirm ? 'Driver confirmed' : 'Driver rejected', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateConditionReport = async (req, res) => {
  const { conditionBefore, conditionAfter } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const isCustomer = booking.customer.toString() === req.user.id;
    const vehicle = await Vehicle.findById(booking.vehicle);
    const isOwner = vehicle.owner.toString() === req.user.id;
    if (!isCustomer && !isOwner) return res.status(403).json({ msg: 'Not authorized' });

    let images = [];
    if (req.files && req.files.length) {
      images = req.files.map(file => file.path); // Cloudinary URLs
    }

    const report = new ConditionReport({
      booking: req.params.id,
      reportedBy: req.user.id,
      conditionBefore,
      conditionAfter,
      images,
    });
    await report.save();

    res.json({ msg: 'Condition report submitted', report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.approveBooking = async (req, res) => {
  const { approval } = req.body; // Match frontend's 'approval' key

  try {
    const booking = await Booking.findById(req.params.id).populate('vehicle');
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }
    if (booking.vehicle.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ msg: 'Booking already processed' });
    }

    booking.ownerApproved = approval;
    booking.status = approval ? 'approved' : 'cancelled';

    if (!approval) {
      const vehicle = await Vehicle.findById(booking.vehicle);
      vehicle.availability = true;
      await vehicle.save();
    }

    await booking.save();
    res.json({ msg: approval ? 'Booking approved' : 'Booking declined', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};