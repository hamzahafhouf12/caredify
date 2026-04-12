const User     = require('../models/User');
const Patient  = require('../models/Patient');
const Clinic   = require('../models/Clinic');
const Device   = require('../models/Device');
const Alert    = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const Ticket   = require('../models/Ticket');
const { asyncHandler } = require('../middleware/error');

// ── GET /api/admin/dashboard/overview ───────────────────────
exports.getOverview = asyncHandler(async (req, res) => {
  const now        = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLastM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLastM   = new Date(now.getFullYear(), now.getMonth(), 0);
  const last7d     = new Date(Date.now() - 7 * 86400000);

  const [
    usersByRole, clinicsByStatus, devicesByStatus, ticketsByPriority,
    newToday, newThisMonth, newLastMonth,
    firmwareNeeded, activeLogins7d, totalPatients, activeAlerts,
  ] = await Promise.all([
    User.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: { role: '$role', status: '$status' }, count: { $sum: 1 } } },
    ]),
    Clinic.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Device.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Ticket.aggregate([
      { $match: { status: { $in: ['open', 'in_progress'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    User.countDocuments({ createdAt: { $gte: startToday  }, deletedAt: null }),
    User.countDocuments({ createdAt: { $gte: startMonth  }, deletedAt: null }),
    User.countDocuments({ createdAt: { $gte: startLastM, $lte: endLastM }, deletedAt: null }),
    Device.countDocuments({ 'firmware.needsUpdate': true, deletedAt: null }),
    AuditLog.distinct('userId', { action: 'LOGIN', status: 'success', createdAt: { $gte: last7d } }),
    Patient.countDocuments({ deletedAt: null }),
    Alert.countDocuments({ lue: false }),
  ]);

  const accounts = {};
  usersByRole.forEach(({ _id, count }) => {
    if (!accounts[_id.role]) accounts[_id.role] = { total: 0 };
    accounts[_id.role][_id.status] = (accounts[_id.role][_id.status] || 0) + count;
    accounts[_id.role].total += count;
  });

  const totalAccounts = Object.values(accounts).reduce((s, v) => s + v.total, 0);
  const monthGrowth   = newLastMonth > 0
    ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
    : newThisMonth > 0 ? 100 : 0;

  const clinics = clinicsByStatus.reduce((a, v) => ({ ...a, [v._id]: v.count }), {});
  const devices = devicesByStatus.reduce((a, v) => ({ ...a, [v._id]: v.count }), {});
  const tickets = ticketsByPriority.reduce((a, v) => ({ ...a, [v._id]: v.count }), {});

  res.json({
    success: true,
    data: {
      generatedAt: new Date(),
      platform: {
        totalAccounts, newToday, newThisMonth, monthGrowth,
        activeUsersLast7d: activeLogins7d.length,
        totalPatients, activeAlerts,
      },
      accounts,
      clinics: {
        active:    clinics.active    || 0,
        inactive:  clinics.inactive  || 0,
        suspended: clinics.suspended || 0,
        total: Object.values(clinics).reduce((s, v) => s + v, 0),
      },
      devices: {
        active:      devices.active      || 0,
        offline:     devices.offline     || 0,
        maintenance: devices.maintenance || 0,
        faulty:      devices.faulty      || 0,
        unassigned:  devices.unassigned  || 0,
        total: Object.values(devices).reduce((s, v) => s + v, 0),
        firmwareUpdatesNeeded: firmwareNeeded,
      },
      support: {
        open: tickets,
        critical: tickets.critical || 0,
        high:     tickets.high     || 0,
      },
    },
  });
});

// ── GET /api/admin/dashboard/trends ─────────────────────────
exports.getTrends = asyncHandler(async (req, res) => {
  const days      = parseInt(req.query.days) || 30;
  const startDate = new Date(Date.now() - days * 86400000);

  const [accountGrowth, loginActivity, clinicGrowth] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: startDate }, deletedAt: null } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AuditLog.aggregate([
      { $match: { action: 'LOGIN', status: 'success', createdAt: { $gte: startDate } } },
      { $group: {
        _id:         { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        logins:      { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      }},
      { $project: { logins: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
      { $sort: { _id: 1 } },
    ]),
    Clinic.aggregate([
      { $match: { createdAt: { $gte: startDate }, deletedAt: null } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({ success: true, data: { period: { days, from: startDate }, accountGrowth, loginActivity, clinicGrowth } });
});

// ── GET /api/admin/dashboard/security ───────────────────────
exports.getSecurityOverview = asyncHandler(async (req, res) => {
  const last24h = new Date(Date.now() - 86400000);
  const last7d  = new Date(Date.now() - 7 * 86400000);

  const [failedLogins, lockedAccounts, dataShares7d, recentFailures] = await Promise.all([
    AuditLog.countDocuments({ action: 'LOGIN_FAILED', createdAt: { $gte: last24h } }),
    User.countDocuments({ lockUntil: { $gt: new Date() }, deletedAt: null }),
    AuditLog.countDocuments({ action: 'DATA_SHARE', createdAt: { $gte: last7d } }),
    AuditLog.find({ status: 'failure', createdAt: { $gte: last24h } })
      .sort({ createdAt: -1 }).limit(20)
      .select('action userEmail ipAddress createdAt description'),
  ]);

  res.json({
    success: true,
    data: {
      failedLogins24h: failedLogins,
      lockedAccounts, dataShares7d, recentFailures,
      compliance: {
        rgpd: true, hipaa: true,
        auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS) || 365,
      },
    },
  });
});

// ── GET /api/admin/dashboard/performance ────────────────────
exports.getPerformance = asyncHandler(async (req, res) => {
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const startLastM = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const endLastM   = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

  const [newUsersM, newUsersLM, newClinicsM, newClinicsLM, ticketStats, avgResolution] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: startMonth }, deletedAt: null }),
    User.countDocuments({ createdAt: { $gte: startLastM, $lte: endLastM }, deletedAt: null }),
    Clinic.countDocuments({ createdAt: { $gte: startMonth }, deletedAt: null }),
    Clinic.countDocuments({ createdAt: { $gte: startLastM, $lte: endLastM }, deletedAt: null }),
    Ticket.aggregate([
      { $match: { createdAt: { $gte: startMonth } } },
      { $group: { _id: null, total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } } } },
    ]),
    Ticket.aggregate([
      { $match: { status: { $in: ['resolved', 'closed'] }, 'sla.resolvedAt': { $exists: true }, createdAt: { $gte: startMonth } } },
      { $project: { hours: { $divide: [{ $subtract: ['$sla.resolvedAt', '$createdAt'] }, 3600000] } } },
      { $group: { _id: null, avg: { $avg: '$hours' } } },
    ]),
  ]);

  const g  = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
  const ts = ticketStats[0] || { total: 0, resolved: 0 };

  res.json({
    success: true,
    data: {
      month: startMonth.toISOString().slice(0, 7),
      kpis: {
        newAccountsThisMonth:     { value: newUsersM,   growth: g(newUsersM, newUsersLM) },
        newClinicsThisMonth:      { value: newClinicsM, growth: g(newClinicsM, newClinicsLM) },
        ticketResolutionRate:     { value: ts.total ? Math.round((ts.resolved / ts.total) * 100) : 0 },
        avgTicketResolutionHours: { value: Math.round(avgResolution[0]?.avg || 0) },
      },
    },
  });
});
