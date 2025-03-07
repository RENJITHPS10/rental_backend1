const Support = require('../models/Support');

exports.createTicket = async (req, res) => {
  const { issue } = req.body;

  try {
    const ticket = new Support({
      user: req.user.id,
      issue,
    });
    await ticket.save();
    res.json({ msg: 'Support ticket created', ticket });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getTickets = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const tickets = await Support.find().populate('user', 'name email');
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.resolveTicket = async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const ticket = await Support.findById(id);
    if (!ticket) return res.status(404).json({ msg: 'Ticket not found' });
    ticket.status = 'resolved';
    await ticket.save();
    res.json({ msg: 'Ticket resolved', ticket });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};