const mongoose = require("mongoose");

const medicamentSchema = new mongoose.Schema(
  {
    nom:       { type: String, required: true }, // e.g. "Aspirine"
    posologie: { type: String, required: true }, // e.g. "100mg, 1 fois/jour"
    duree:     { type: String, required: true }, // e.g. "30 jours"
    instructions: { type: String, default: "" }, // e.g. "Prendre après repas"
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
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

    // List of prescribed medications
    medicaments: {
      type: [medicamentSchema],
      default: [],
    },

    // General notes
    notes: {
      type: String,
      default: "",
    },

    // Status of the prescription
    statut: {
      type: String,
      enum: ["active", "terminée", "annulée"],
      default: "active",
    },

    // Related ECG record (optional)
    ecgRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ECGRecord",
      default: null,
    },

    // Export formats generated
    exports: {
      pdf:  { type: Boolean, default: false },
      hl7:  { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const Prescription = mongoose.model("Prescription", prescriptionSchema);
module.exports = Prescription;