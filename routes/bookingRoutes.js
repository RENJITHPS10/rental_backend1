const express = require('express');
const router = express.Router();
const { createBooking, getBookings, cancelBooking, confirmDriver, updateConditionReport, approveBooking } = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const upload = require('../middleware/cloudinary');

router.post('/', auth, createBooking);
router.get('/', auth, getBookings);
router.put('/cancel/:id', auth, cancelBooking);
router.put('/confirm-driver/:id', auth, confirmDriver);
router.put('/condition/:id', auth, upload.array('images', 5), updateConditionReport);
router.put('/approve/:id', auth, approveBooking);

module.exports = router;