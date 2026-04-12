const Clinic   = require('../models/Clinic');
const User     = require('../models/User');
const Device   = require('../models/Device');
const AuditLog = require('../models/AuditLog');
const { AppError, asyncHandler } = require('../middleware/error');

// ── GET /api/admin/clinics ───────────────────────────────────
exports.getClinics = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, sort = 'createdAt', order = 'desc' } = req.query;
  const filter = { deletedAt: null };

  if (status) filter.status = status;
  if (search) filter.$or = [
    { name:           { $regex: search, $options: 'i' } },
    { email:          { $regex: search, $options: 'i' } },
    { 'address.city': { $regex: search, $options: 'i' } },
  ];

  const [total, clinics] = await Promise.all([
    Clinic.countDocuments(filter),
    Clinic.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
  ]);

  res.json({
    success: true, data: clinics,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) },
  });
});

// ── GET /api/admin/clinics/:id ───────────────────────────────
exports.getClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findOne({ _id: req.params.id, deletedAt: null });
  if (!clinic) throw new AppError('Clinic not found.', 404);

  const [userCount, deviceCount] = await Promise.all([
    User.countDocuments({ clinicId: clinic._id, deletedAt: null }),
    Device.countDocuments({ clinicId: clinic._id, deletedAt: null }),
  ]);

  res.json({
    success: true,
    data: { ...clinic.toObject(), stats: { userCount, deviceCount } },
  });
});

// ── POST /api/admin/clinics ──────────────────────────────────
exports.createClinic = asyncHandler(async (req, res) => {
  const { name, type, phone, email, website, licenseNumber, address, license, timezone, language, currency, notes } = req.body;

  const clinic = await Clinic.create({
    name, type, notes,
    phone:         phone         || undefined,
    email:         email         || undefined,
    website:       website       || undefined,
    licenseNumber: licenseNumber || undefined,
    address:       address       || {},
    license:       license       || {},
    timezone:      timezone      || 'Europe/Paris',
    language:      language      || 'fr',
    currency:      currency      || 'EUR',
    createdBy:     req.user._id,
  });

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'CLINIC_CREATE', resource: 'Clinic', resourceId: clinic._id,
    ipAddress: req.ip, status: 'success',
    description: `Created clinic: ${name}`,
  });

  res.status(201).json({ success: true, data: clinic });
});

// ── PUT /api/admin/clinics/:id ───────────────────────────────
exports.updateClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true, runValidators: true }
  );
  if (!clinic) throw new AppError('Clinic not found.', 404);

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'CLINIC_UPDATE', resource: 'Clinic', resourceId: clinic._id,
    ipAddress: req.ip, status: 'success',
    description: `Updated clinic: ${clinic.name}`,
  });

  res.json({ success: true, data: clinic });
});

// ── PATCH /api/admin/clinics/:id/status ─────────────────────
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const clinic = await Clinic.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { status },
    { new: true }
  );
  if (!clinic) throw new AppError('Clinic not found.', 404);

  // Si suspension : suspendre aussi tous les utilisateurs de la clinique
  if (status === 'suspended') {
    await User.updateMany(
      { clinicId: clinic._id, role: { $ne: 'admin' } },
      { status: 'suspended' }
    );
  }

  const action = status === 'suspended' ? 'CLINIC_SUSPEND' : 'CLINIC_UPDATE';
  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action, resource: 'Clinic', resourceId: clinic._id,
    ipAddress: req.ip, status: 'success',
    description: `${action}: ${clinic.name}`,
  });

  res.json({ success: true, data: clinic });
});

// ── PUT /api/admin/clinics/:id/license ──────────────────────
exports.updateLicense = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { license: req.body },
    { new: true }
  );
  if (!clinic) throw new AppError('Clinic not found.', 404);
  res.json({ success: true, data: clinic });
});

// ── DELETE /api/admin/clinics/:id  (soft delete) ────────────
exports.deleteClinic = asyncHandler(async (req, res) => {
  const clinic = await Clinic.findOne({ _id: req.params.id, deletedAt: null });
  if (!clinic) throw new AppError('Clinic not found.', 404);

  await Clinic.findByIdAndUpdate(clinic._id, { deletedAt: new Date(), status: 'inactive' });

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'CLINIC_DELETE', resource: 'Clinic', resourceId: clinic._id,
    ipAddress: req.ip, status: 'success',
    description: `Deleted clinic: ${clinic.name}`,
  });

  res.json({ success: true, message: 'Clinic deleted.' });
});
