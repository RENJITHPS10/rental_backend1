const express = require('express');
const router = express.Router();
const { addVehicle, getVehicles, updateVehicle, deleteVehicle, rateVehicle, getOwnerVehicles } = require('../controllers/vehicleController');
const auth = require('../middleware/auth');
const upload = require('../middleware/cloudinary');

router.post('/', auth, upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'insuranceImage', maxCount: 1 }
]), addVehicle);

router.get('/', auth, getVehicles);

router.put('/:id', auth, upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'insuranceImage', maxCount: 1 }
]), updateVehicle);

router.delete('/:id', auth, deleteVehicle);
router.post('/rate/:id', auth, rateVehicle);
router.get('/owner', auth, getOwnerVehicles);

module.exports = router;