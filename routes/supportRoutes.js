const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createTicket, getTickets, resolveTicket } = require('../controllers/supportController');

router.post('/', auth, createTicket);
router.get('/', auth, getTickets);
router.put('/:id/resolve', auth, resolveTicket);

module.exports = router;