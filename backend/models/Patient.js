const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    // --- Basic Info ---
    cin:     { type: String, required: true, unique: true },
    nom:     { type: String, required: true },
    prenom:  { type: String, default: "" },
    age:     { type: Number, required: true },
    genre:   { type: String, enum: ["Homme", "Femme", "Autre"], default: "Homme" },
    adresse: { type: String, default: "" },

    // --- Medical Info ---
    groupeSanguin: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: null,
    },
    antecedents:       { type: [String], default: [] }, // e.g. ["Diabète", "HTA"]
    traitementsEnCours: { type: [String], default: [] }, // e.g. ["Aspirine 100mg"]
    
    // Historique des observations textuelles du médecin
    observations: [
      {
        date: { type: Date, default: Date.now },
        texte: { type: String, required: true },
        medecinId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
      }
    ],

    // --- Risk & AI ---
    etat: {
      type: String,
      enum: ["Stable", "Modéré", "Critique"],
      default: "Stable",
    },
    niveauRisque: {
      type: String,
      enum: ["Faible", "Modéré", "Élevé"],
      default: "Faible",
    },
    derniereAnalyseIA: { type: Date, default: null },

    // --- Doctor Reference ---
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