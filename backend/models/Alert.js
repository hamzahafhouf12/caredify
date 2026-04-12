const mongoose = require('mongoose');

/**
 * ALERT MODEL — CAREDIFY
 *
 * Utilisé par :
 *  - Dashboard Cardiologue : ses propres alertes
 *  - Dashboard Admin       : vue macro (stats globales)
 */
const alertSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    medecin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Clinique concernée (pour filtrage Dashboard Clinique)
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: ['Urgente', 'Modéré', 'Info'],
    },
    detail: {
      type: String,
      required: true,
    },
    lue: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

alertSchema.index({ medecin: 1, lue: 1 });
alertSchema.index({ clinicId: 1 });
alertSchema.index({ patient: 1 });

module.exports = mongoose.model('Alert', alertSchema);
