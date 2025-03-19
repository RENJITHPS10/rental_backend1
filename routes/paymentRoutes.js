const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createPayment,getAllPayments } = require('../controllers/paymentController');

router.post('/:bookingId', auth, createPayment);
router.get('/', auth, getAllPayments); // New route for admin

module.exports = router;