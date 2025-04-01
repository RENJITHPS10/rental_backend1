const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/cloudinary');
const {
  addVehicle,
  getVehicles,
  getOwnerVehicles,
  updateVehicle,
  deleteVehicle,
  rateVehicle,
  getOwnerVehicleReviews,
  approveVehicle,
  rejectVehicle,getVehicle
} = require('../controllers/vehicleController');

router.post('/add', auth, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'insuranceImage', maxCount: 1 },{ name: 'pollutionImage', maxCount: 1 }]), addVehicle);
router.get('/', getVehicles);
router.get('/owner', auth, getOwnerVehicles);
router.put('/:id', auth, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'insuranceImage', maxCount: 1 }]), updateVehicle);
router.delete('/:id', auth, deleteVehicle);
router.post('/:bookingId/rate-vehicle', auth, rateVehicle);
router.get('/owner/reviews', auth, getOwnerVehicleReviews);
router.put('/:id/approve', auth, approveVehicle);
router.put('/:id/reject', auth, rejectVehicle);
router.get('/:id', auth, getVehicle);


module.exports = router;