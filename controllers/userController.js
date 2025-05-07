const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');


exports.registerUser = async (req, res) => {
  const { name, email, password, role, mobile } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    if ((role === 'customer' || role === 'driver') && !req.file) {
      return res.status(400).json({ msg: 'License is required for customers and drivers' });
    }

    let license = req.file ? req.file.path : null;

    user = new User({ name, email, password: hashedPassword, role, mobile, license });
    await user.save();

    // Create Driver document if role is 'driver'
    if (role === 'driver') {
      const driver = new Driver({ user: user._id });
      await driver.save();
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.status(201).json({ token, role: user.role, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};



exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }
    if (user.isSuspended) {
      return res.status(403).json({ msg: 'Account suspended' });
    }

    // Check license verification for customer and driver roles
    if (user.role === 'customer' || user.role === 'driver') {
      if (user.licenseStatus === 'pending') {
        return res.status(403).json({ msg: 'License not verified. Please wait for admin approval.' });
      }
      if (user.licenseStatus === 'rejected') {
        return res.status(403).json({ 
          msg: `License rejected. Reason: ${user.licenseRejectionReason || 'No reason provided'}` 
        });
      }
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.json({ token, role: user.role, userId: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
}


exports.updateProfile = async (req, res) => {
  const { name, mobile } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.name = name || user.name;
    user.mobile = mobile || user.mobile;
    if (req.file) user.license = req.file.path;

    await user.save();
    res.json({ msg: 'Profile updated', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getLicenseStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('license licenseVerified');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json({
      msg: 'License status retrieved',
      license: user.license,
      verified: user.licenseVerified,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email mobile license licenseStatus');
    if (!user) return res.status(404).json({ msg: 'User not found' });

    res.json({
      msg: 'Profile retrieved',
      user: {
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        license: user.license,
        licenseStatus: user.licenseStatus,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
