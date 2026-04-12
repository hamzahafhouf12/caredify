const mongoose = require('mongoose');

/**
 * PATIENT MODEL — CAREDIFY (V1 unified)
 *
 * Étendu pour supporter tous les dashboards :
 *  - clinicId  : requis par le Dashboard Clinique
 *  - prenom    : complète le champ nom du repo partagé
 *  - dispositifECG : référence au Device ECG assigné
 *  - etat      : valeurs alignées avec les alertes (Stable/Modéré/Critique)
 */
const patientSchema = new mongoose.Schema(
  {
    // ── Identification ────────────────────────────────────────
    cin:    { type: String, required: true, unique: true, trim: true },
    nom:    { type: String, required: true, trim: true },
    prenom: { type: String, default: '', trim: true },

    // ── Données démographiques ────────────────────────────────
    age:          { type: Number, required: true, min: 0, max: 150 },
    dateNaissance:{ type: Date, default: null },
    telephone:    { type: String, default: null, trim: true },
    adresse:      { type: String, default: '', trim: true },

    // ── État clinique ─────────────────────────────────────────
    etat: {
      type: String,
      required: true,
      default: 'Stable',
      enum: ['Stable', 'Modéré', 'Critique'],
    },

    // ── Relations ─────────────────────────────────────────────
    /**
     * Cardiologue/médecin responsable du patient.
     * Le Dashboard Cardiologue filtre ses patients par ce champ.
     */
    medecin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Clinique à laquelle est rattaché le patient.
     * Le Dashboard Clinique filtre ses patients par ce champ.
     */
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
    },

    /**
     * Dispositif ECG actuellement assigné au patient.
     * Référence le modèle Device.
     */
    dispositifECG: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
    },

    // ── Soft delete ──────────────────────────────────────────
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Index ────────────────────────────────────────────────────
patientSchema.index({ medecin: 1 });
patientSchema.index({ clinicId: 1 });
patientSchema.index({ etat: 1 });
patientSchema.index({ cin: 1 });

// ── Virtual : nom complet ─────────────────────────────────────
patientSchema.virtual('nomComplet').get(function () {
  return this.prenom ? `${this.prenom} ${this.nom}` : this.nom;
});

module.exports = mongoose.model('Patient', patientSchema);
