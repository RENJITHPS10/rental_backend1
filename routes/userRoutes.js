const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/cloudinary');
const { registerUser, loginUser, updateProfile, getLicenseStatus, getProfile } = require('../controllers/userController');

router.post('/register', upload.single('license'), registerUser);
router.post('/login', loginUser);
router.put('/profile', auth, upload.single('license'), updateProfile);
router.get('/license-status', auth, getLicenseStatus);
router.get('/profile', auth, getProfile); // New route for fetching profile


module.exports = router;