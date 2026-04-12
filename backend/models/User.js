const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

/**
 * USER MODEL — CAREDIFY (V1 unified)
 *
 * Fusionne les deux codebases :
 *  - Backend partagé  : nom/prenom, matchPassword(), cardiologue/patient roles
 *  - Backend Admin    : firstName/lastName, permissions, clinicId, soft-delete, lockUntil
 *
 * Stratégie retenue :
 *  - On garde TOUS les champs des deux côtés.
 *  - nom/prenom  → aliases virtuels vers firstName/lastName (compat repo partagé)
 *  - matchPassword() conservé en alias de comparePassword() (compat repo partagé)
 *  - Les rôles sont l'union des deux listes.
 */

const userSchema = new mongoose.Schema({
  // ── Identité (Admin backend) ──────────────────────────────
  firstName: { type: String, required: true, trim: true, maxlength: 50 },
  lastName:  { type: String, required: true, trim: true, maxlength: 50 },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, select: false, minlength: 8 },
  phone:     { type: String, trim: true, default: null },

  /**
   * ROLES — union des deux backends :
   *  - admin         → dashboard admin (ce projet)
   *  - cardiologist  → dashboard Cardiologue  (anciennement "cardiologue")
   *  - clinic        → dashboard Clinique
   *  - nurse         → pas de login V1
   *  - technician    → pas de login V1
   *  - patient       → app mobile uniquement
   */
  role: {
    type: String,
    enum: ['admin', 'cardiologist', 'clinic', 'nurse', 'technician', 'patient'],
    required: true,
  },

  /**
   * PERMISSIONS (V1 — role-based simple)
   */
  permissions: {
    read_patients: { type: Boolean, default: false },
    share_data:    { type: Boolean, default: false },
    access_shared: { type: Boolean, default: false },
  },

  // ── Affiliation organisationnelle ─────────────────────────
  clinicId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic',  default: null },
  cardiologistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',    default: null },

  // ── Statut ────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending',
  },

  // ── Email verification (repo partagé) ─────────────────────
  isVerified:               { type: Boolean, default: false },
  emailVerificationToken:   { type: String,  select: false },
  emailVerificationExpires: { type: Date },

  // ── Password reset (repo partagé) ─────────────────────────
  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpires: { type: Date },

  // ── Multi-pays ────────────────────────────────────────────
  country:  { type: String, default: 'FR' },
  timezone: { type: String, default: 'Europe/Paris' },
  language: { type: String, default: 'fr' },

  // ── Sécurité avancée (Admin backend) ─────────────────────
  lastLogin:     { type: Date,   default: null },
  lastLoginIP:   { type: String, default: null },
  loginAttempts: { type: Number, default: 0 },
  lockUntil:     { type: Date,   default: null },
  refreshToken:  { type: String, select: false },

  // ── Méta ─────────────────────────────────────────────────
  notes:     { type: String, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedAt: { type: Date, default: null },

}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// ── Index ────────────────────────────────────────────────────
userSchema.index({ role: 1, status: 1 });
userSchema.index({ clinicId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// ── Virtuals ─────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Compat aliases — repo partagé utilise "nom" et "prenom"
 * Les dashboards Cardiologue/Clinique peuvent continuer à lire ces champs.
 */
userSchema.virtual('nom').get(function () { return this.firstName; });
userSchema.virtual('prenom').get(function () { return this.lastName; });

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Pre-save : hash password ──────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(12));
  next();
});

// ── Methods ──────────────────────────────────────────────────

/** Admin backend — comparePassword */
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Repo partagé compat — matchPassword
 * Les routes auth du repo partagé utilisent user.matchPassword()
 */
userSchema.methods.matchPassword = async function (candidate) {
  return this.comparePassword(candidate);
};

/** Gestion verrouillage compte (Admin backend) */
userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set:   { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2h
  }
  return this.updateOne(updates);
};

// ── Statics ──────────────────────────────────────────────────

/** Permissions par défaut selon le rôle */
userSchema.statics.getDefaultPermissions = function (role) {
  const map = {
    admin:        { read_patients: true,  share_data: true,  access_shared: true  },
    cardiologist: { read_patients: true,  share_data: true,  access_shared: true  },
    clinic:       { read_patients: true,  share_data: false, access_shared: true  },
    nurse:        { read_patients: false, share_data: false, access_shared: false },
    technician:   { read_patients: false, share_data: false, access_shared: false },
    patient:      { read_patients: false, share_data: false, access_shared: false },
  };
  return map[role] || { read_patients: false, share_data: false, access_shared: false };
};

module.exports = mongoose.model('User', userSchema);
