const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/error');

// ── GET /api/admin/audit ─────────────────────────────────────
exports.getLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, action, userId, status, from, to, search } = req.query;
  const filter = {};

  if (action) filter.action = action;
  if (userId) filter.userId = userId;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }
  if (search) filter.$or = [
    { userEmail:   { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean(),
  ]);

  res.json({
    success: true, data: logs,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) },
  });
});

// ── GET /api/admin/audit/summary ────────────────────────────
exports.getSummary = asyncHandler(async (req, res) => {
  const last30d = new Date(Date.now() - 30 * 86400000);

  const [byAction, byStatus, dataShares] = await Promise.all([
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: last30d } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AuditLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    AuditLog.find({ action: 'DATA_SHARE' })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('userEmail userRole shareMetadata.dataType shareMetadata.fromUserId shareMetadata.toUserId createdAt status')
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      period: '30d',
      byAction,
      byStatus: byStatus.reduce((a, v) => ({ ...a, [v._id]: v.count }), {}),
      dataShares,
    },
  });
});

// ── GET /api/admin/audit/export  (CSV) ──────────────────────
exports.exportLogs = asyncHandler(async (req, res) => {
  const { from, to, action } = req.query;
  const filter = {};

  if (action) filter.action = action;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);
  }

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const header = 'Date,Action,Utilisateur,Rôle,IP,Statut,Description\n';
  const rows   = logs.map((l) =>
    `"${new Date(l.createdAt).toISOString()}","${l.action}","${l.userEmail || ''}","${l.userRole || ''}","${l.ipAddress || ''}","${l.status}","${(l.description || '').replace(/"/g, "'")}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audit-${Date.now()}.csv"`);
  res.send(header + rows);
});
