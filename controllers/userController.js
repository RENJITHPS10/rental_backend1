const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  const { name, email, password, role, mobile } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    let license = null;
    if (role === 'driver' || role === 'customer') {
      if (!req.file) return res.status(400).json({ msg: 'License file is required' });
      license = req.file.path;
    }

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      mobile,
      license,
    });

    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.status(201).json({ token, role: user.role, userId: user._id });
  } catch (err) {
    console.error('Error in registerUser:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    if (user.isSuspended) return res.status(403).json({ msg: 'Account suspended' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    res.json({ token, role: user.role, userId: user._id });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, mobile } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const license = req.file ? req.file.path : user.license;

    if (name) user.name = name;
    if (mobile) user.mobile = mobile;
    user.license = license;

    await user.save();

    res.json({ msg: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Profile Update Error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};