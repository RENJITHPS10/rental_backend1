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
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.suspendUser = async (req, res) => {
  const { id } = req.params;
  const { suspend } = req.body;

  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (suspend === undefined) return res.status(400).json({ msg: 'Suspend status required' });

    user.isSuspended = suspend;
    await user.save();

    res.json({ msg: `User ${suspend ? 'suspended' : 'unsuspended'}`, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};