/**
 * AUTH CONTROLLER — CAREDIFY (unified)
 *
 * Gère deux flux d'authentification :
 *  1. Admin login (JWT long-lived + refresh token) — Admin backend
 *  2. OTP register/verify/reset — repo partagé (Cardiologue, Clinique, Patient)
 */

const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendVerificationOTP, sendPasswordResetOTP } = require('../utils/email');
const { AppError, asyncHandler } = require('../middleware/error');

// ── Token helpers ────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'caredify_super_secret_dev_key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'caredify_refresh_secret', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

// ────────────────────────────────────────────────────────────
// ADMIN LOGIN  —  POST /api/admin/auth/login
// ────────────────────────────────────────────────────────────
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password required.', 400);

  const user = await User.findOne({ email, deletedAt: null, role: 'admin' }).select('+password');
  if (!user) {
    await AuditLog.create({
      userEmail: email, action: 'LOGIN_FAILED', resource: 'Auth',
      ipAddress: req.ip, status: 'failure', description: 'Unknown admin email',
    });
    throw new AppError('Invalid credentials.', 401);
  }

  if (user.isLocked) throw new AppError('Account locked. Try again in 2 hours.', 423);

  const valid = await user.comparePassword(password);
  if (!valid) {
    await user.incrementLoginAttempts();
    await AuditLog.create({
      userId: user._id, userEmail: user.email, userRole: user.role,
      action: 'LOGIN_FAILED', resource: 'Auth',
      ipAddress: req.ip, status: 'failure', description: 'Invalid password',
    });
    throw new AppError('Invalid credentials.', 401);
  }

  await user.updateOne({
    loginAttempts: 0, $unset: { lockUntil: 1 },
    lastLogin: new Date(), lastLoginIP: req.ip,
  });

  const token   = signToken(user._id);
  const refresh = signRefresh(user._id);
  await user.updateOne({ refreshToken: refresh });

  await AuditLog.create({
    userId: user._id, userEmail: user.email, userRole: user.role,
    action: 'LOGIN', resource: 'Auth', ipAddress: req.ip,
    status: 'success', description: 'Admin login',
  });

  res.json({
    success: true, token, refreshToken: refresh,
    data: {
      _id: user._id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, role: user.role,
    },
  });
});

// ────────────────────────────────────────────────────────────
// SHARED LOGIN  —  POST /api/auth/login
// Utilisé par Dashboard Cardiologue et Clinique
// ────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password required.', 400);

  const user = await User.findOne({ email, deletedAt: null }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Email ou mot de passe incorrect', 401);
  }

  if (user.status === 'suspended') throw new AppError('Account suspended.', 403);

  // Vérification email activée — désactiver en dev si nécessaire
  if (!user.isVerified && user.role !== 'admin') {
    throw new AppError('Please verify your email address before logging in.', 403);
  }

  const token = signToken(user._id);

  res.json({
    success: true,
    _id:     user._id,
    nom:     user.firstName,   // compat repo partagé
    prenom:  user.lastName,    // compat repo partagé
    firstName: user.firstName,
    lastName:  user.lastName,
    email:   user.email,
    role:    user.role,
    token,
  });
});

// ────────────────────────────────────────────────────────────
// REGISTER  —  POST /api/auth/register
// ────────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { nom, prenom, firstName, lastName, email, password, role } = req.body;

  // Accepte nom/prenom (repo partagé) OU firstName/lastName (Admin)
  const fName = firstName || nom;
  const lName = lastName  || prenom;

  if (await User.findOne({ email, deletedAt: null })) {
    throw new AppError('Un utilisateur avec cet email existe déjà', 400);
  }

  const otp       = Math.floor(100000 + Math.random() * 900000).toString();
  const salt      = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(otp, salt);

  const perms = User.getDefaultPermissions(role);

  const user = await User.create({
    firstName: fName, lastName: lName, email, password, role,
    permissions:              perms,
    isVerified:               false,
    emailVerificationToken:   hashedOtp,
    emailVerificationExpires: Date.now() + 10 * 60 * 1000,
  });

  await sendVerificationOTP(email, otp);

  res.status(201).json({
    success: true,
    message: 'Account created. Please check your email to verify your account.',
    email:   user.email,
  });
});

// ────────────────────────────────────────────────────────────
// VERIFY EMAIL  —  POST /api/auth/verify-email
// ────────────────────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email, deletedAt: null,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken');

  if (!user || !user.emailVerificationToken) {
    throw new AppError('Verification code is invalid or has expired', 400);
  }

  if (user.isVerified) {
    return res.json({ message: 'Your account is already verified. You can log in.' });
  }

  const isMatch = await bcrypt.compare(otp, user.emailVerificationToken);
  if (!isMatch) throw new AppError('Incorrect verification code', 400);

  user.isVerified               = true;
  user.emailVerificationToken   = undefined;
  user.emailVerificationExpires = undefined;
  user.status                   = 'active';
  await user.save();

  const token = signToken(user._id);
  res.json({
    success: true,
    message: 'Email verified successfully! You can now log in.',
    token,
  });
});

// ────────────────────────────────────────────────────────────
// RESEND VERIFICATION  —  POST /api/auth/resend-verification
// ────────────────────────────────────────────────────────────
exports.resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, deletedAt: null }).select('+emailVerificationToken');
  if (!user) throw new AppError('No account found with this email', 404);
  if (user.isVerified) throw new AppError('This account is already verified', 400);

  const otp  = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  user.emailVerificationToken   = await bcrypt.hash(otp, salt);
  user.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendVerificationOTP(email, otp);
  res.json({ success: true, message: 'A new verification code has been sent to your email.' });
});

// ────────────────────────────────────────────────────────────
// FORGOT PASSWORD  —  POST /api/auth/forgot-password
// ────────────────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email, deletedAt: null }).select('+resetPasswordToken');
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  const otp  = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = await bcrypt.genSalt(10);
  user.resetPasswordToken   = await bcrypt.hash(otp, salt);
  user.resetPasswordExpires = Date.now() + 5 * 60 * 1000;
  await user.save();

  await sendPasswordResetOTP(email, otp);
  res.json({ success: true, message: 'Un code de réinitialisation a été envoyé par e-mail.' });
});

// ────────────────────────────────────────────────────────────
// VERIFY OTP  —  POST /api/auth/verify-otp
// ────────────────────────────────────────────────────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email, deletedAt: null,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken');

  if (!user || !user.resetPasswordToken) {
    throw new AppError('Code invalide ou expiré', 400);
  }

  const isMatch = await bcrypt.compare(otp, user.resetPasswordToken);
  if (!isMatch) throw new AppError('Code OTP incorrect', 400);

  res.json({ success: true, message: 'Code vérifié avec succès' });
});

// ────────────────────────────────────────────────────────────
// RESET PASSWORD  —  POST /api/auth/reset-password
// ────────────────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({
    email, deletedAt: null,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +password');

  if (!user || !user.resetPasswordToken) {
    throw new AppError('Session de réinitialisation expirée', 400);
  }

  const isMatch = await bcrypt.compare(otp, user.resetPasswordToken);
  if (!isMatch) throw new AppError('Code OTP invalide', 400);

  user.password             = newPassword;
  user.resetPasswordToken   = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Votre mot de passe a été réinitialisé avec succès !' });
});

// ────────────────────────────────────────────────────────────
// LOGOUT  —  POST /api/admin/auth/logout
// ────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    await AuditLog.create({
      userId: req.user._id, userEmail: req.user.email, userRole: req.user.role,
      action: 'LOGOUT', resource: 'Auth', ipAddress: req.ip, status: 'success',
    });
  }
  res.json({ success: true, message: 'Logged out.' });
});

// ────────────────────────────────────────────────────────────
// ME  —  GET /api/admin/auth/me
// ────────────────────────────────────────────────────────────
exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

// ────────────────────────────────────────────────────────────
// REFRESH TOKEN  —  POST /api/admin/auth/refresh
// ────────────────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required.', 400);

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'caredify_refresh_secret');
  const user    = await User.findOne({ _id: decoded.id, refreshToken, deletedAt: null }).select('+refreshToken');
  if (!user) throw new AppError('Invalid refresh token.', 401);

  const token = signToken(user._id);
  res.json({ success: true, token });
});

// ────────────────────────────────────────────────────────────
// CHANGE PASSWORD  —  PUT /api/admin/auth/change-password
// ────────────────────────────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!await user.comparePassword(currentPassword)) {
    throw new AppError('Current password incorrect.', 400);
  }

  user.password = newPassword;
  await user.save();

  await AuditLog.create({
    userId: user._id, userEmail: user.email, userRole: user.role,
    action: 'PASSWORD_CHANGE', resource: 'Auth', ipAddress: req.ip, status: 'success',
  });

  res.json({ success: true, message: 'Password changed.' });
});
