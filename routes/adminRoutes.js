const express = require('express');
const router = express.Router();
const { manageUser, approveVehicle, getAllBookings, detectFraud } = require('../controllers/adminController');
const auth = require('../middleware/auth');

router.put('/users/:id', auth, manageUser);
router.put('/vehicles/approve/:id', auth, approveVehicle);
router.get('/bookings', auth, getAllBookings);
router.get('/fraud', auth, detectFraud);

module.exports = router;