const express = require('express');
const router = express.Router();
const { assignDriver, completePickupDrop, reportCondition, getEarnings, rateDriver, getCarLocation } = require('../controllers/driverController');
const auth = require('../middleware/auth');
const upload = require('../middleware/cloudinary');

router.post('/assign/:bookingId', auth, assignDriver);
router.put('/complete/:bookingId', auth, completePickupDrop);
router.put('/condition/:bookingId', auth, upload.array('images', 5), reportCondition);
router.get('/earnings', auth, getEarnings);
router.post('/rate/:bookingId', auth, rateDriver);
router.get('/location/:bookingId', auth, getCarLocation);

module.exports = router;