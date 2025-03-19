const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/cloudinary');
const {
  assignDriver,
  confirmDriverAssignment,
  completePickupDrop,
  reportCondition,
  getEarnings,
  rateDriver,
  getCarLocation,
  updateCarLocation,
  getDriverBookings,
  getDriverReviews,getAvailableDrivers,updateDriver,getDriverProfile
} = require('../controllers/driverController');

router.post('/:bookingId/assign', auth, assignDriver);
router.post('/:bookingId/confirm', auth, confirmDriverAssignment);
router.post('/:bookingId/complete', auth, completePickupDrop);
router.post('/:bookingId/report', auth, upload.array('images', 10), reportCondition);
router.get('/earnings', auth, getEarnings);
router.post('/:bookingId/rate', auth, rateDriver);
router.get('/:bookingId/location', auth, getCarLocation);
router.put('/:bookingId/location', auth, updateCarLocation);
router.get('/bookings', auth, getDriverBookings);
router.get('/reviews', auth, getDriverReviews);
router.get('/available', auth, getAvailableDrivers); // Added
router.put('/:driverId', auth, updateDriver); // New route
router.get('/profile', auth, getDriverProfile); // Add this line
module.exports = router;