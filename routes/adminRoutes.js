const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { manageUser, getAllBookings, detectFraud, getAllUsers, suspendUser,getVehiclesforapprove,getUnverifiedUsers, verifyUserLicense,getConditionReports } = require('../controllers/adminController');

router.put('/users/:id', auth, manageUser);
router.get('/bookings', auth, getAllBookings);
router.get('/fraud', auth, detectFraud);
router.get('/users', auth, getAllUsers);
router.put('/users/:id/suspend', auth, suspendUser);
router.get('/vehicles/unapproved', auth, getVehiclesforapprove)
router.get('/users/unverified', auth, getUnverifiedUsers);
router.put('/users/:userId/verify', auth, verifyUserLicense);
router.get('/condition-reports',auth,getConditionReports)

module.exports = router;