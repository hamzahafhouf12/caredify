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
    type: {
      type: String, // 'Urgente', 'Modéré', 'Info'
      required: true,
      enum: ["Urgente", "Modéré", "Info"]
    },
    detail: {
      type: String,
      required: true,
    },
    lue: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const Alert = mongoose.model("Alert", alertSchema);
module.exports = Alert;
