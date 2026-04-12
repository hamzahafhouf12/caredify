const mongoose = require('mongoose');

/**
 * AUDIT LOG — CAREDIFY
 * Métadonnées uniquement — pas de contenu médical.
 */
const auditLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userEmail: { type: String },
  userRole:  { type: String },

  action: {
    type: String,
    enum: [
      // Auth
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'ACCOUNT_LOCKED',
      // Comptes
      'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_SUSPEND', 'USER_ACTIVATE',
      // Cliniques
      'CLINIC_CREATE', 'CLINIC_UPDATE', 'CLINIC_DELETE', 'CLINIC_SUSPEND',
      // Équipements
      'DEVICE_CREATE', 'DEVICE_UPDATE', 'DEVICE_ASSIGN', 'DEVICE_FIRMWARE',
      // Données médicales (métadonnées seulement)
      'DATA_SHARE',
      // Tickets
      'TICKET_CREATE', 'TICKET_RESOLVE', 'TICKET_CLOSE',
      // Admin
      'SETTINGS_UPDATE', 'EXPORT',
    ],
    required: true,
  },

  resource:   { type: String },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },

  // Métadonnées partage DATA_SHARE uniquement
  shareMetadata: {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    toUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dataType:   { type: String },
  },

  ipAddress:   { type: String },
  status:      { type: String, enum: ['success', 'failure'], default: 'success' },
  description: { type: String },

}, { timestamps: true });

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
