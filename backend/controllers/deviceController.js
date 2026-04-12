const Device   = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const { AppError, asyncHandler } = require('../middleware/error');

// ── GET /api/admin/devices ───────────────────────────────────
exports.getDevices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, clinicId } = req.query;
  const filter = { deletedAt: null };

  if (status)   filter.status   = status;
  if (clinicId) filter.clinicId = clinicId;
  if (search)   filter.$or = [
    { serialNumber: { $regex: search, $options: 'i' } },
    { model:        { $regex: search, $options: 'i' } },
  ];

  const [total, devices] = await Promise.all([
    Device.countDocuments(filter),
    Device.find(filter)
      .populate('clinicId',  'name')
      .populate('patientId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
  ]);

  res.json({
    success: true, data: devices,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) },
  });
});

// ── GET /api/admin/devices/stats ────────────────────────────
exports.getStats = asyncHandler(async (req, res) => {
  const [byStatus, firmwareNeeded, total] = await Promise.all([
    Device.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 }, avgBattery: { $avg: '$batteryLevel' } } },
    ]),
    Device.countDocuments({ 'firmware.needsUpdate': true, deletedAt: null }),
    Device.countDocuments({ deletedAt: null }),
  ]);

  const stats = byStatus.reduce((a, v) => ({
    ...a,
    [v._id]: { count: v.count, avgBattery: Math.round(v.avgBattery || 0) },
  }), {});

  res.json({ success: true, data: { total, ...stats, firmwareUpdatesNeeded: firmwareNeeded } });
});

// ── POST /api/admin/devices ──────────────────────────────────
exports.createDevice = asyncHandler(async (req, res) => {
  const { serialNumber, model, type, leads, clinicId, patientId, notes, purchaseDate, warrantyExpires, firmware, location } = req.body;

  const device = await Device.create({
    serialNumber, model, type,
    leads:          leads    || 12,
    clinicId:       clinicId  || undefined,
    patientId:      patientId || undefined,
    notes, purchaseDate, warrantyExpires,
    firmware:       firmware  || {},
    location:       location  || {},
  });

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'DEVICE_CREATE', resource: 'Device', resourceId: device._id,
    ipAddress: req.ip, status: 'success',
    description: `Device registered: ${serialNumber}`,
  });

  res.status(201).json({ success: true, data: device });
});

// ── PUT /api/admin/devices/:id ───────────────────────────────
exports.updateDevice = asyncHandler(async (req, res) => {
  const device = await Device.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!device) throw new AppError('Device not found.', 404);

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'DEVICE_UPDATE', resource: 'Device', resourceId: device._id,
    ipAddress: req.ip, status: 'success',
    description: `Updated device: ${device.serialNumber}`,
  });

  res.json({ success: true, data: device });
});

// ── PATCH /api/admin/devices/:id/assign ─────────────────────
exports.assignDevice = asyncHandler(async (req, res) => {
  const { clinicId, patientId } = req.body;

  const device = await Device.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    {
      clinicId:  clinicId  || null,
      patientId: patientId || null,
      status:    clinicId || patientId ? 'active' : 'unassigned',
    },
    { new: true }
  );
  if (!device) throw new AppError('Device not found.', 404);

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'DEVICE_ASSIGN', resource: 'Device', resourceId: device._id,
    ipAddress: req.ip, status: 'success',
    description: `Assigned device: ${device.serialNumber}`,
  });

  res.json({ success: true, data: device });
});

// ── POST /api/admin/devices/:id/firmware-update ─────────────
exports.firmwareUpdate = asyncHandler(async (req, res) => {
  const device = await Device.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    {
      'firmware.current':     req.body.version || 'latest',
      'firmware.needsUpdate': false,
      'firmware.lastUpdated': new Date(),
    },
    { new: true }
  );
  if (!device) throw new AppError('Device not found.', 404);

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'DEVICE_FIRMWARE', resource: 'Device', resourceId: device._id,
    ipAddress: req.ip, status: 'success',
    description: `Firmware updated: ${device.serialNumber}`,
  });

  res.json({ success: true, data: device });
});

// ── DELETE /api/admin/devices/:id  (soft delete) ────────────
exports.deleteDevice = asyncHandler(async (req, res) => {
  const device = await Device.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { deletedAt: new Date() },
    { new: true }
  );
  if (!device) throw new AppError('Device not found.', 404);
  res.json({ success: true, message: 'Device removed.' });
});
