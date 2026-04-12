const Ticket   = require('../models/Ticket');
const AuditLog = require('../models/AuditLog');
const { AppError, asyncHandler } = require('../middleware/error');

// ── GET /api/admin/tickets ───────────────────────────────────
exports.getTickets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, priority, category, clinicId } = req.query;
  const filter = {};

  if (status)   filter.status   = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (clinicId) filter.clinicId = clinicId;
  if (search)   filter.$or = [
    { title:        { $regex: search, $options: 'i' } },
    { ticketNumber: { $regex: search, $options: 'i' } },
  ];

  const [total, tickets] = await Promise.all([
    Ticket.countDocuments(filter),
    Ticket.find(filter)
      .populate('clinicId',    'name')
      .populate('assignedTo',  'firstName lastName')
      .populate('createdBy',   'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
  ]);

  res.json({
    success: true, data: tickets,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) },
  });
});

// ── GET /api/admin/tickets/stats ────────────────────────────
exports.getStats = asyncHandler(async (req, res) => {
  const [byStatus, byPriority, byCategory, slaBreached] = await Promise.all([
    Ticket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.aggregate([
      { $match: { status: { $in: ['open', 'in_progress'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Ticket.countDocuments({ 'sla.breached': true }),
  ]);

  res.json({
    success: true,
    data: {
      byStatus:   byStatus.reduce((a, v) => ({ ...a, [v._id]: v.count }), {}),
      byPriority: byPriority.reduce((a, v) => ({ ...a, [v._id]: v.count }), {}),
      byCategory, slaBreached,
    },
  });
});

// ── POST /api/admin/tickets ──────────────────────────────────
exports.createTicket = asyncHandler(async (req, res) => {
  const { title, description, category, priority, clinicId, deviceId } = req.body;

  const ticket = await Ticket.create({
    title, description, category,
    priority: priority || 'medium',
    clinicId: clinicId || undefined,
    deviceId: deviceId || undefined,
    createdBy: req.user._id,
  });

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'TICKET_CREATE', resource: 'Ticket', resourceId: ticket._id,
    ipAddress: req.ip, status: 'success',
    description: `Ticket created: ${ticket.ticketNumber}`,
  });

  res.status(201).json({ success: true, data: ticket });
});

// ── PATCH /api/admin/tickets/:id/assign ─────────────────────
exports.assignTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    { assignedTo: req.body.assignedTo, status: 'in_progress' },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found.', 404);
  res.json({ success: true, data: ticket });
});

// ── POST /api/admin/tickets/:id/reply ───────────────────────
exports.replyTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw new AppError('Ticket not found.', 404);

  ticket.messages.push({
    authorId:    req.user._id,
    authorEmail: req.user.email,
    content:     req.body.content,
  });

  await ticket.save();
  res.json({ success: true, data: ticket });
});

// ── PATCH /api/admin/tickets/:id/resolve ────────────────────
exports.resolveTicket = asyncHandler(async (req, res) => {
  const now    = new Date();
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    { status: 'resolved', resolvedAt: now, resolution: req.body.resolution, 'sla.resolvedAt': now },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found.', 404);

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'TICKET_RESOLVE', resource: 'Ticket', resourceId: ticket._id,
    ipAddress: req.ip, status: 'success',
    description: `Resolved: ${ticket.ticketNumber}`,
  });

  res.json({ success: true, data: ticket });
});

// ── PATCH /api/admin/tickets/:id/close ──────────────────────
exports.closeTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findByIdAndUpdate(
    req.params.id,
    { status: 'closed', closedAt: new Date() },
    { new: true }
  );
  if (!ticket) throw new AppError('Ticket not found.', 404);

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'TICKET_CLOSE', resource: 'Ticket', resourceId: ticket._id,
    ipAddress: req.ip, status: 'success',
    description: `Closed: ${ticket.ticketNumber}`,
  });

  res.json({ success: true, data: ticket });
});
