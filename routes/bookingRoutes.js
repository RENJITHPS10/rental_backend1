const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/cloudinary');
const {
  createBooking,
  getBookings,
  cancelBooking,
  confirmDriver,
  updateConditionReport,
  approveBooking,
} = require('../controllers/bookingController');

router.post('/', auth, createBooking);
router.get('/', auth, getBookings);
router.put('/:id/cancel', auth, cancelBooking);
router.put('/:id/confirm-driver', auth, confirmDriver);
router.post('/:id/condition-report', auth, upload.array('images', 10), updateConditionReport);
router.put('/:id/approve', auth, approveBooking);

module.exports = router;