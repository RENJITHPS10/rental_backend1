const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updateProfile } = require('../controllers/userController');
const auth = require('../middleware/auth');
const upload=require('../middleware/cloudinary')

router.post('/register',upload.single('license'), registerUser);
router.post('/login', loginUser);
router.put('/profile',upload.single('license'),auth,updateProfile);

module.exports = router;