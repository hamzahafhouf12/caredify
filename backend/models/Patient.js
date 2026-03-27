const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    cin: { type: String, required: true, unique: true },
    nom: { type: String, required: true },
    age: { type: Number, required: true },
    adresse: { type: String, required: true },
    etat: { type: String, required: true, default: "Stable" },
    // References the doctor who manages this patient
    medecin: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Patient = mongoose.model("Patient", patientSchema);
module.exports = Patient;
