const express = require('express');
const router = express.Router();
const { getOwnerEarnings } = require('../controllers/ownerController');
const auth = require('../middleware/auth');

router.get('/earnings', auth, getOwnerEarnings);

module.exports = router;