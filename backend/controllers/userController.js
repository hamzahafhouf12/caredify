const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { AppError, asyncHandler } = require('../middleware/error');

const genPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let p = 'Cd@';
  for (let i = 0; i < 9; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
};

// ── GET /api/admin/users ─────────────────────────────────────
exports.getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, status, clinicId, sort = 'createdAt', order = 'desc' } = req.query;
  const filter = { deletedAt: null };

  if (role)     filter.role     = role;
  if (status)   filter.status   = status;
  if (clinicId) filter.clinicId = clinicId;
  if (search)   filter.$or = [
    { firstName: { $regex: search, $options: 'i' } },
    { lastName:  { $regex: search, $options: 'i' } },
    { email:     { $regex: search, $options: 'i' } },
  ];

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .populate('clinicId',       'name status')
      .populate('cardiologistId', 'firstName lastName email')
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit),
  ]);

  res.json({
    success: true, data: users,
    pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / +limit) },
  });
});

// ── GET /api/admin/users/:id ─────────────────────────────────
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null })
    .populate('clinicId',       'name status license')
    .populate('cardiologistId', 'firstName lastName email');
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
});

// ── POST /api/admin/users ────────────────────────────────────
exports.createUser = asyncHandler(async (req, res) => {
  const {
    firstName, lastName, email, phone, role,
    clinicId, cardiologistId, country, timezone, language, notes,
  } = req.body;

  if (await User.findOne({ email, deletedAt: null })) {
    throw new AppError('Email already in use.', 409);
  }

  const defaultStatus = ['nurse', 'technician'].includes(role) ? 'active' : 'pending';
  const password      = genPassword();
  const perms         = User.getDefaultPermissions(role);

  const user = await User.create({
    firstName, lastName, email, password,
    phone:          phone          || undefined,
    role, status:   defaultStatus,
    permissions:    perms,
    clinicId:       clinicId       || undefined,
    cardiologistId: cardiologistId || undefined,
    country:        country        || 'FR',
    timezone:       timezone       || 'Europe/Paris',
    language:       language       || 'fr',
    notes:          notes          || undefined,
    createdBy:      req.user._id,
  });

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'USER_CREATE', resource: 'User', resourceId: user._id,
    ipAddress: req.ip, status: 'success',
    description: `Created ${role} account: ${email}`,
  });

  res.status(201).json({
    success: true, data: user,
    temporaryPassword: ['nurse', 'technician', 'patient'].includes(role) ? null : password,
    note: ['nurse', 'technician'].includes(role)
      ? 'Nurse/Technician accounts have no login in V1.'
      : `Temporary password sent: ${password}`,
  });
});

// ── PUT /api/admin/users/:id ─────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const allowed = ['firstName', 'lastName', 'phone', 'clinicId', 'cardiologistId', 'country', 'timezone', 'language', 'notes'];
  const updates = {};
  allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k] || undefined; });

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    updates,
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('User not found.', 404);

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'USER_UPDATE', resource: 'User', resourceId: user._id,
    ipAddress: req.ip, status: 'success',
    description: `Updated user: ${user.email}`,
  });

  res.json({ success: true, data: user });
});

// ── PATCH /api/admin/users/:id/status ───────────────────────
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { status },
    { new: true }
  );
  if (!user) throw new AppError('User not found.', 404);

  const action = status === 'suspended' ? 'USER_SUSPEND' : 'USER_ACTIVATE';
  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action, resource: 'User', resourceId: user._id,
    ipAddress: req.ip, status: 'success',
    description: `${action}: ${user.email}`,
  });

  res.json({ success: true, data: user });
});

// ── DELETE /api/admin/users/:id  (soft delete RGPD) ─────────
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, deletedAt: null });
  if (!user) throw new AppError('User not found.', 404);

  await User.findByIdAndUpdate(user._id, {
    deletedAt: new Date(),
    firstName: 'SUPPRIMÉ',
    lastName:  'SUPPRIMÉ',
    email:     `deleted_${user._id}@caredify.internal`,
    phone:     null,
    notes:     null,
    status:    'inactive',
  });

  await AuditLog.create({
    userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
    action: 'USER_DELETE', resource: 'User', resourceId: user._id,
    ipAddress: req.ip, status: 'success',
    description: `RGPD deletion: ${user.email}`,
  });

  res.json({ success: true, message: 'User deleted and anonymized (RGPD).' });
});

// ── POST /api/admin/users/:id/unlock ────────────────────────
exports.unlockUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { loginAttempts: 0, $unset: { lockUntil: 1 } },
    { new: true }
  );
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: user });
});
