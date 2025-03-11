const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getOwnerEarnings } = require('../controllers/ownerController');

router.get('/earnings', auth, getOwnerEarnings);

module.exports = router;