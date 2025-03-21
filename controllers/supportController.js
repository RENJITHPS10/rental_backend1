const Support = require('../models/Support');

exports.createTicket = async (req, res) => {
  const { issue } = req.body;

  try {
    const ticket = new Support({ user: req.user.id, issue });
    await ticket.save();
    res.json({ msg: 'Support ticket created', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getTickets = async (req, res) => {

  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const tickets = await Support.find().populate('user', 'name email');
  
    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.resolveTicket = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });

    const ticket = await Support.findById(req.params.id);
    if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });

    ticket.status = 'resolved';
    await ticket.save();
    res.json({ msg: 'Ticket resolved', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
exports.getCustomerSupportTickets = async (req, res) => {
  try {

    const tickets = await Support.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');
    res.json({ tickets: tickets || [] });
    console.log(tickets)
  } catch (err) {
    console.error('Error in getCustomerSupportTickets:', err.message);
    res.status(500).json({ msg: 'Server error', tickets: [] });
  }
};