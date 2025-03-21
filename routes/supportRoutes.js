const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createTicket, getTickets, resolveTicket,getCustomerSupportTickets } = require('../controllers/supportController');

router.post('/', auth, createTicket);
router.get('/tickets', auth, getCustomerSupportTickets);
router.get('/', auth, getTickets);
router.put('/:id/resolve', auth, resolveTicket);

module.exports = router;