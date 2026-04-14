const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
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

    // Alert type (used for filtering)
    type: {
      type: String,
      enum: ["Urgente", "Modéré", "Info"],
      required: true,
    },

    // Priority level — maps to Red/Orange/Green in UI
    priorite: {
      type: String,
      enum: ["Critique", "A_surveiller", "Normal"],
      default: "Normal",
    },

    // Alert details / IA description
    detail: {
      type: String,
      required: true,
    },

    // Doctor's medical annotation
    annotationMedecin: {
      type: String,
      default: "",
    },

    // Workflow status
    statut: {
      type: String,
      enum: ["en_attente", "validée", "rejetée", "ignorée"],
      default: "en_attente",
    },

    // Read status
    lue: {
      type: Boolean,
      default: false,
    },

    // Source of alert
    source: {
      type: String,
      enum: ["ia", "manuel", "device"],
      default: "ia",
    },
  },
  { timestamps: true }
);

const Alert = mongoose.model("Alert", alertSchema);
module.exports = Alert;