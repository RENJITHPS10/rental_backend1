const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { manageUser, getAllBookings, detectFraud, getAllUsers, suspendUser,getVehiclesforapprove } = require('../controllers/adminController');

router.put('/users/:id', auth, manageUser);
router.get('/bookings', auth, getAllBookings);
router.get('/fraud', auth, detectFraud);
router.get('/users', auth, getAllUsers);
router.put('/users/:id/suspend', auth, suspendUser);
router.get('/vehicles/unapproved', auth, getVehiclesforapprove)

module.exports = router;