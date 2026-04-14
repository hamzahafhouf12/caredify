const mongoose = require("mongoose");

const ecgRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    medecin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Raw ECG signal — array of float values (mV)
    // For production, use blob storage (S3, etc.)
    signalData: {
      type: [Number],
      default: [],
    },

    // Sampling frequency in Hz (e.g. 250, 500)
    frequenceEchantillonnage: {
      type: Number,
      default: 250,
    },

    // Duration in seconds
    duree: {
      type: Number,
      default: null,
    },

    // Source of ECG data
    source: {
      type: String,
      enum: ["clinique", "device", "upload", "simulation"],
      default: "clinique",
    },

    // Mock IA interpretations (SG1 model)
    iaInterpretations: {
      arythmie:           { type: Boolean, default: false },
      fibrillationAuriculaire: { type: Boolean, default: false },
      anomalieST:         { type: Boolean, default: false },
      insuffisanceCardiaque:   { type: Boolean, default: false },
      tachycardie:        { type: Boolean, default: false },
      bradycardie:        { type: Boolean, default: false },
      hrvFaible:          { type: Boolean, default: false },
      scoreRisque:        { type: Number, default: 0 }, // 0-100
      resumeIA:           { type: String, default: "" },
    },

    // Annotations temporelles spécifiques sur le tracé ECG
    annotationsTemporelles: [
      {
        startTime: { type: Number, required: true }, // in seconds
        endTime: { type: Number, required: true },   // in seconds
        note: { type: String, required: true },
        medecinId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now }
      }
    ],

    // Doctor annotations on this ECG (general comment)
    annotationMedecin: {
      type: String,
      default: "",
    },

    // Was this ECG reviewed by the doctor?
    revue: {
      type: Boolean,
      default: false,
    },
    // Doctor's decision regarding IA findings
    decisionIA: {
      type: String,
      enum: ["en_attente", "confirmé", "rejeté", "corrigé"],
      default: "en_attente",
    },
  },
  { timestamps: true }
);

const ECGRecord = mongoose.model("ECGRecord", ecgRecordSchema);
module.exports = ECGRecord;