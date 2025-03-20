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
    // Restrict to admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Fetch all users except those with role 'admin'
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password');

    // Optional: Check if any users are found
    if (!users || users.length === 0) {
      return res.status(404).json({ msg: 'No non-admin users found' });
    }

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
exports.getVehiclesforapprove = async (req, res) => {
  try {
    // Ensure only admins can access this endpoint
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ msg: 'Unauthorized: Admins only' });
    }

    // Query for unapproved vehicles only
    const query = { isApproved: false };

    const vehicles = await Vehicle.find(query).populate('owner', 'name');
    res.json(vehicles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
exports.getUnverifiedUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Only admins can view unverified users' });
    }

    const users = await User.find({ licenseVerified: false, license: { $ne: null } })
      .select('name email role license licenseVerified');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.verifyUserLicense = async (req, res) => {
  const { userId } = req.params;
  const { approve, rejectionReason } = req.body; // Add rejectionReason

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Only admins can verify licenses' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (approve) {
      user.licenseVerified = true;
      user.licenseStatus = 'approved';
      user.licenseRejectionReason = null; // Clear any previous reason
    } else {
      user.licenseVerified = false;
      user.licenseStatus = 'rejected';
      user.licenseRejectionReason = rejectionReason || 'No reason provided'; // Default if no reason given
    }

    await user.save();

    res.json({ 
      msg: approve ? 'License approved' : 'License rejected', 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        licenseStatus: user.licenseStatus,
        licenseRejectionReason: user.licenseRejectionReason,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};