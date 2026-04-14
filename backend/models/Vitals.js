const mongoose = require("mongoose");

const vitalsSchema = new mongoose.Schema(
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
    // ECG - Heart Rate in bpm
    frequenceCardiaque: {
      type: Number,
      default: null,
    },
    // Heart Rate Variability
    hrv: {
      type: Number,
      default: null,
    },
    // Oxygen Saturation
    spo2: {
      type: Number,
      default: null,
    },
    // Blood Pressure
    tensionSystolique: {
      type: Number,
      default: null,
    },
    tensionDiastolique: {
      type: Number,
      default: null,
    },
    // ECG raw notes or AI result
    ecgNote: {
      type: String,
      default: null,
    },
    // Source: 'manual', 'device', 'ia'
    source: {
      type: String,
      enum: ["manual", "device", "ia"],
      default: "manual",
    },
  },
  { timestamps: true }
);

const Vitals = mongoose.model("Vitals", vitalsSchema);
module.exports = Vitals;