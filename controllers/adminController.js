const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

exports.manageUser = async (req, res) => {
  const { id } = req.params;
  const { suspend, verifyLicense } = req.body;

  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (suspend !== undefined) user.isSuspended = suspend;
    if (verifyLicense !== undefined) user.licenseVerified = verifyLicense;
    await user.save();

    res.json({ msg: 'User updated', user });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.approveVehicle = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });

    vehicle.isApproved = true;
    await vehicle.save();

    res.json({ msg: 'Vehicle approved', vehicle });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const bookings = await Booking.find()
      .populate('vehicle', 'model type')
      .populate('customer', 'name')
      .populate('driver', 'name');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.detectFraud = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const bookings = await Booking.find().populate('customer', 'email');
    const userBookingCount = {};
    bookings.forEach(booking => {
      userBookingCount[booking.customer._id] = (userBookingCount[booking.customer._id] || 0) + 1;
    });

    const potentialFraud = Object.entries(userBookingCount)
      .filter(([_, count]) => count > 5)
      .map(([userId]) => bookings.find(b => b.customer._id.toString() === userId).customer);

    res.json({ msg: 'Fraud detection results', potentialFraud });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};