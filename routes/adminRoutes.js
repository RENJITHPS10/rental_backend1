const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { manageUser, getAllBookings, detectFraud, getAllUsers, suspendUser } = require('../controllers/adminController');

router.put('/users/:id', auth, manageUser);
router.get('/bookings', auth, getAllBookings);
router.get('/fraud', auth, detectFraud);
router.get('/users', auth, getAllUsers);
router.put('/users/:id/suspend', auth, suspendUser);

module.exports = router;