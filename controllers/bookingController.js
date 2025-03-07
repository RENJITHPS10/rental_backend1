const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const ConditionReport = require('../models/ConditionReport');
const cloudinary = require('cloudinary').v2;

exports.createBooking = async (req, res) => {
  const { vehicleId, startDate, endDate, pickupLocation, dropLocation, needsDriver } = req.body;

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || !vehicle.availability || !vehicle.isApproved) {
      return res.status(400).json({ msg: 'Vehicle not available or not approved' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = vehicle.price * days;

    const booking = new Booking({
      customer: req.user.id,
      vehicle: vehicleId,
      startDate,
      endDate,
      pickupLocation,
      dropLocation,
      totalPrice,
      needsDriver: needsDriver !== undefined ? needsDriver : true,
    });

    vehicle.availability = false;
    await vehicle.save();
    await booking.save();

    res.json({ msg: 'Booking created', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'customer') {
      bookings = await Booking.find({ customer: req.user.id });
    } else if (req.user.role === 'owner') {
      bookings = await Booking.find().populate('vehicle').where('vehicle.owner').equals(req.user.id);
    } else if (req.user.role === 'driver') {
      bookings = await Booking.find({ driver: req.user.id });
    }
    bookings = await Booking.populate(bookings, [
      { path: 'vehicle', select: 'model type category' },
      { path: 'customer', select: 'name' },
      { path: 'driver', select: 'name' },
    ]);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ msg: 'Booking already cancelled' });
    }

    booking.status = 'cancelled';
    const vehicle = await Vehicle.findById(booking.vehicle);
    vehicle.availability = true;
    await vehicle.save();
    await booking.save();

    res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.confirmDriver = async (req, res) => {
  const { id } = req.params;
  const { confirm } = req.body;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    if (!booking.driver) return res.status(400).json({ msg: 'No driver assigned yet' });
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
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateConditionReport = async (req, res) => {
  const { id } = req.params;
  const { conditionBefore, conditionAfter } = req.body;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    const isCustomer = booking.customer.toString() === req.user.id;
    const isOwner = (await Vehicle.findById(booking.vehicle)).owner.toString() === req.user.id;
    if (!isCustomer && !isOwner) return res.status(403).json({ msg: 'Not authorized' });

    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        images.push(result.secure_url);
      }
    }

    const report = new ConditionReport({
      booking: id,
      reportedBy: req.user.id,
      conditionBefore,
      conditionAfter,
      images,
    });
    await report.save();

    res.json({ msg: 'Condition report submitted', report });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.approveBooking = async (req, res) => {
  const { id } = req.params;
  const { approve } = req.body;

  try {
    const booking = await Booking.findById(id).populate('vehicle');
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });
    if (booking.vehicle.owner.toString() !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });

    booking.ownerApproved = approve;
    if (!approve) {
      booking.status = 'cancelled';
      const vehicle = await Vehicle.findById(booking.vehicle);
      vehicle.availability = true;
      await vehicle.save();
    }
    await booking.save();

    res.json({ msg: approve ? 'Booking approved' : 'Booking declined', booking });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};