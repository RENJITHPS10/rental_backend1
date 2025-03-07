const express = require('express');
const router = express.Router();
const { createTicket, getTickets, resolveTicket } = require('../controllers/supportController');
const auth = require('../middleware/auth');

router.post('/', auth, createTicket);
router.get('/', auth, getTickets);
router.put('/:id', auth, resolveTicket);

module.exports = router;