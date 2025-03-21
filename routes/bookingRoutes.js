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
  getBookingById,cancelDriverRequest, getBooking
} = require('../controllers/bookingController');

router.post('/', auth, createBooking);
router.get('/', auth, getBookings);
router.delete('/:id', auth, cancelBooking);
router.put('/:id/driver', auth, confirmDriver);
router.post('/:id/report', auth, upload.array('images', 10), updateConditionReport);
router.put('/:id/approve', auth, approveBooking);
router.get('/:id', auth, getBookingById);
router.put('/:bookingId/cancel-driver', auth, cancelDriverRequest);
router.get('/report/:bookingId', auth, getBooking);


module.exports = router;