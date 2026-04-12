/**
 * AUTH MIDDLEWARE — CAREDIFY (unified)
 *
 * Exporte :
 *  protect    — vérifie le JWT (utilisé par tous les dashboards)
 *  adminOnly  — réservé admin (Admin backend)
 *  admin      — alias de adminOnly (compat repo partagé)
 *  doctor     — cardiologue ou admin (compat repo partagé)
 *  clinic     — clinic ou admin
 *  requireRole(roles[]) — générique
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('./error');

// ── protect ──────────────────────────────────────────────────
exports.protect = asyncHandler(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new AppError('Authentication required.', 401);
  }

  const token   = auth.split(' ')[1];
  const secret  = process.env.JWT_SECRET || 'caredify_super_secret_dev_key';
  const decoded = jwt.verify(token, secret);

  // Sélectionne le password uniquement si nécessaire — on l'exclut ici
  const user = await User.findById(decoded.id).select('-password');
  if (!user)                      throw new AppError('User no longer exists.', 401);
  if (user.deletedAt)             throw new AppError('Account deleted.', 401);
  if (user.status === 'suspended') throw new AppError('Account suspended.', 403);

  req.user = user;
  next();
});

// ── adminOnly ────────────────────────────────────────────────
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  throw new AppError('Admin access required.', 403);
};

/**
 * admin — alias pour compatibilité avec le repo partagé
 * Le repo partagé importe { protect, admin } depuis authMiddleware.js
 */
exports.admin = exports.adminOnly;

// ── doctor ───────────────────────────────────────────────────
/**
 * Compat repo partagé — les routes Cardiologue utilisent le middleware doctor.
 * Accepte : cardiologist, cardiologue (legacy), medecin (legacy), admin
 */
exports.doctor = (req, res, next) => {
  const allowed = ['cardiologist', 'cardiologue', 'medecin', 'admin'];
  if (req.user && allowed.includes(req.user.role)) return next();
  throw new AppError('Cardiologist access required.', 403);
};

// ── clinic ───────────────────────────────────────────────────
exports.clinic = (req, res, next) => {
  const allowed = ['clinic', 'admin'];
  if (req.user && allowed.includes(req.user.role)) return next();
  throw new AppError('Clinic access required.', 403);
};

// ── requireRole (générique) ──────────────────────────────────
exports.requireRole = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) return next();
  throw new AppError(`Access restricted to: ${roles.join(', ')}.`, 403);
};
